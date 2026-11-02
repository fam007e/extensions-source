package eu.kanade.tachiyomi.extension.en.hentai2read

import eu.kanade.tachiyomi.source.model.Filter
import eu.kanade.tachiyomi.source.model.FilterList
import eu.kanade.tachiyomi.source.model.MangasPage
import eu.kanade.tachiyomi.source.model.Page
import eu.kanade.tachiyomi.source.model.SChapter
import eu.kanade.tachiyomi.source.model.SManga
import eu.kanade.tachiyomi.source.model.SMangaUpdate
import keiyoushi.annotation.Source
import keiyoushi.network.addCookie
import keiyoushi.network.get
import keiyoushi.source.KeiSource
import keiyoushi.utils.firstInstanceOrNull
import keiyoushi.utils.parseAs
import kotlinx.serialization.json.JsonElement
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

    private suspend fun getProps(url: String): Hentai2ReadProps = client.get(url).props()

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

        // Tag names -> ids (the site filters by id: with=1,2 is AND, without=3, match=any switches with= to OR)
        val include = resolveTagIds(filters.firstInstanceOrNull<IncludeTags>()?.state) +
            resolveTagIds(filters.firstInstanceOrNull<ArtistsFilter>()?.state)
        val exclude = resolveTagIds(filters.firstInstanceOrNull<ExcludeTags>()?.state)
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

    override fun getFilterList(data: JsonElement?): FilterList = FilterList(
        TypeFilter(),
        SortFilter(),
        StatusFilter(),
        Filter.Separator(),
        Filter.Header("Use the exact tag name, e.g. Elf-Elves, Big Breasts, Netorare"),
        IncludeTags(),
        ExcludeTags(),
        ArtistsFilter(),
        MatchAny(),
    )
}
