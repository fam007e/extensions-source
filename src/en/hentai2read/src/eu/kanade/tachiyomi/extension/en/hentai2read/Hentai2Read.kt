package eu.kanade.tachiyomi.extension.en.hentai2read

import eu.kanade.tachiyomi.source.model.Filter
import eu.kanade.tachiyomi.source.model.FilterList
import eu.kanade.tachiyomi.source.model.MangasPage
import eu.kanade.tachiyomi.source.model.Page
import eu.kanade.tachiyomi.source.model.SChapter
import eu.kanade.tachiyomi.source.model.SManga
import eu.kanade.tachiyomi.source.model.SMangaUpdate
import keiyoushi.annotation.Source
import keiyoushi.network.Fetch
import keiyoushi.network.addCookie
import keiyoushi.network.get
import keiyoushi.source.KeiSource
import keiyoushi.utils.firstInstanceOrNull
import keiyoushi.utils.getArrayOrNull
import keiyoushi.utils.parseAs
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Response

/**
 * The site is an Inertia SSR app: every page embeds its data as JSON in
 * `<script data-page="app" type="application/json">`. We read that instead of scraping markup.
 */
@Source
abstract class Hentai2Read : KeiSource() {

    override val supportsLatest = true

    private companion object {
        // New-format book URL: /original/8768-summer-tutoring
        val BOOK_URL = Regex("^/(original|doujinshi|imageset)/\\d+.*")

        val TYPE_VALUES = arrayOf(null, "original", "doujinshi", "imageset")
        val SORT_VALUES = arrayOf(null, "latest", "most-viewed", "top-rated", "alphabetical")
        val STATUS_VALUES = arrayOf(null, "ongoing", "completed")
    }

    override fun OkHttpClient.Builder.configureClient() = addCookie("adult" to "1")

    private fun Response.props(): Hentai2ReadProps = parseAs<InertiaPageDto> { html ->
        val marker = html.indexOf("data-page=\"app\"")
        if (marker < 0) throw IllegalStateException("Page data not found")
        val start = html.indexOf('>', marker) + 1
        val end = html.indexOf("</script>", start)
        if (start == 0 || end < start) throw IllegalStateException("Malformed page data")
        html.substring(start, end)
    }.pageProps()

    private suspend fun getProps(url: String): Hentai2ReadProps = client.get(url, headers, Fetch.DOCUMENT).props()

    private fun buildUrl(path: String, page: Int, params: Map<String, String?> = emptyMap()): String {
        val builder = (if (path.startsWith("http")) path else baseUrl + path).toHttpUrl().newBuilder()
        params.forEach { (k, v) -> if (!v.isNullOrBlank()) builder.setQueryParameter(k, v) }
        if (page > 1) builder.setQueryParameter("page", page.toString())
        return builder.build().toString()
    }

    // /search paginates correctly (checked: page=2 returns page 2); /browse and tag pages ignore ?page=
    override suspend fun getPopularManga(page: Int): MangasPage = getProps(buildUrl("/search", page, mapOf("sort" to "most-viewed"))).toMangasPage()

    override suspend fun getLatestUpdates(page: Int): MangasPage = getProps(buildUrl("/search", page, mapOf("sort" to "latest"))).toMangasPage()

    override suspend fun getMangaByUrl(url: HttpUrl): SManga? {
        if (url.host != baseUrl.toHttpUrl().host) return null
        return getProps(url.toString()).toMangaOrNull()
    }

    override suspend fun getSearchMangaList(page: Int, query: String, filters: FilterList): MangasPage {
        val q = query.trim()

        val type = TYPE_VALUES.getOrNull(filters.firstInstanceOrNull<TypeFilter>()?.state ?: 0)
        val sort = SORT_VALUES.getOrNull(filters.firstInstanceOrNull<SortFilter>()?.state ?: 0)
        val status = STATUS_VALUES.getOrNull(filters.firstInstanceOrNull<StatusFilter>()?.state ?: 0)

        // The site filters by tag id: with=1,2 is AND, without=3, match=any switches with= to OR
        val selected = filters.filterIsInstance<TagGroup>().flatMap { group -> group.state }
        val include = selected.filter { it.state == Filter.TriState.STATE_INCLUDE }.map { it.id } +
            resolveTagIds(filters.firstInstanceOrNull<ArtistsFilter>()?.state)
        val exclude = selected.filter { it.state == Filter.TriState.STATE_EXCLUDE }.map { it.id } +
            resolveTagIds(filters.firstInstanceOrNull<ExcludeTags>()?.state)
        val matchAny = filters.firstInstanceOrNull<MatchAny>()?.state == true

        val url = buildUrl(
            "/search",
            page,
            mapOf(
                "q" to q,
                "type" to type,
                "sort" to sort,
                "status" to status,
                "with" to include.joinToString(","),
                "without" to exclude.joinToString(","),
                "match" to if (matchAny && include.size > 1) "any" else null,
            ),
        )
        return getProps(url).toMangasPage()
    }

    private suspend fun resolveTagIds(names: String?): List<String> = names.orEmpty()
        .split(',')
        .map { it.trim() }
        .filter { it.isNotEmpty() }
        .map { name ->
            getProps(buildUrl("/search", 1, mapOf("q" to name))).matchingTagId(name)
                ?: throw IllegalArgumentException("Tag not found: $name")
        }

    override suspend fun fetchMangaUpdate(
        manga: SManga,
        chapters: List<SChapter>,
        fetchDetails: Boolean,
        fetchChapters: Boolean,
    ): SMangaUpdate {
        // Entries saved by the old extension look like "/some-slug/" and 404 on the new site.
        val migrate = !BOOK_URL.matches(manga.url)
        val path = if (migrate) resolveLegacyUrl(manga) else manga.url
        val props = getProps(baseUrl + path)
        val updatedManga = if (fetchDetails || migrate) props.bookToManga() else manga
        val updatedChapters = if (fetchChapters || migrate) props.toChapters() else chapters
        return SMangaUpdate(updatedManga, updatedChapters)
    }

    private suspend fun resolveLegacyUrl(manga: SManga): String = getProps(buildUrl("/search", 1, mapOf("q" to manga.title)))
        .findBookUrl(manga.title)
        ?: throw IllegalStateException("\"${manga.title}\" not found on the new site, please migrate it manually")

    override suspend fun getPageList(chapter: SChapter): List<Page> = getProps(baseUrl + chapter.url).pageImages().mapIndexed { i, imageUrl ->
        Page(i, imageUrl = imageUrl)
    }

    override val supportsFilterFetching = true

    // /tags/category is one page; /tags/content is 407 tags across ~9 pages
    private suspend fun fetchTags(path: String): List<Hentai2ReadTag> {
        val tags = mutableListOf<Hentai2ReadTag>()
        var page = 1
        while (true) {
            val result = getProps(buildUrl(path, page)).tagPage() ?: break
            tags += result.first
            if (page++ >= result.second) break
        }
        return tags
    }

    override suspend fun fetchFilterData(): JsonElement {
        val categories = fetchTags("/tags/category")
        val content = fetchTags("/tags/content")
        fun toObjects(tags: List<Hentai2ReadTag>) = JsonArray(
            tags.map { tag ->
                buildJsonObject {
                    put("id", tag.id ?: JsonPrimitive(""))
                    put("name", tag.name ?: "")
                }
            },
        )
        return buildJsonObject {
            put("categories", toObjects(categories))
            put("content", toObjects(content))
        }
    }

    private class TypeFilter : Filter.Select<String>("Type", arrayOf("Any", "Original", "Doujinshi", "Image sets"))
    private class SortFilter :
        Filter.Select<String>(
            "Sort by",
            arrayOf("Newest", "Recently updated", "Most read", "Highest rated", "A to Z"),
        )
    private class StatusFilter : Filter.Select<String>("Status", arrayOf("Any", "Ongoing", "Completed"))
    private class IncludeTags : Filter.Text("Include tags (comma separated)")
    private class ExcludeTags : Filter.Text("Exclude tags (comma separated)")
    private class ArtistsFilter : Filter.Text("Artists (comma separated)")
    private class MatchAny : Filter.CheckBox("Match ANY included tag (default: ALL)")

    private class TagTriState(val id: String, name: String) : Filter.TriState(name)
    private class TagGroup(name: String, tags: List<TagTriState>) : Filter.Group<TagTriState>(name, tags)

    override fun getFilterList(data: JsonElement?): FilterList {
        val dataObj = data as? JsonObject
        val categories = dataObj?.getArrayOrNull("categories")
        val content = dataObj?.getArrayOrNull("content")

        fun tagGroup(name: String, array: JsonArray): TagGroup = TagGroup(
            name,
            array.mapNotNull { element ->
                val obj = element as? JsonObject ?: return@mapNotNull null
                val id = obj["id"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                val tagName = obj["name"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                TagTriState(id, tagName)
            }.sortedBy { it.name },
        )

        if (categories.isNullOrEmpty() || content.isNullOrEmpty()) {
            // Tags not fetched yet (first launch) or fetching failed
            return FilterList(
                TypeFilter(),
                SortFilter(),
                StatusFilter(),
                Filter.Separator(),
                Filter.Header("Tag list loads after the source opens once."),
                Filter.Header("Until then, use the exact tag name, e.g. Elf-Elves"),
                IncludeTags(),
                ExcludeTags(),
                ArtistsFilter(),
                MatchAny(),
            )
        }

        return FilterList(
            TypeFilter(),
            SortFilter(),
            StatusFilter(),
            Filter.Separator(),
            MatchAny(),
            tagGroup("Categories", categories),
            tagGroup("Tags", content),
            Filter.Separator(),
            ArtistsFilter(),
        )
    }
}
