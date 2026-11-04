package eu.kanade.tachiyomi.extension.en.hentai2read

import eu.kanade.tachiyomi.source.model.MangasPage
import eu.kanade.tachiyomi.source.model.SChapter
import eu.kanade.tachiyomi.source.model.SManga
import keiyoushi.utils.tryParseDate
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import java.time.format.DateTimeFormatter
import java.util.Locale

@Serializable
internal class InertiaPageDto(
    private val props: Hentai2ReadProps,
) {
    fun pageProps() = props
}

@Serializable
internal class Hentai2ReadProps(
    private val books: Hentai2ReadBooks? = null,
    private val book: Hentai2ReadBook? = null,
    private val chapters: List<Hentai2ReadChapter>? = null,
    private val tags: Hentai2ReadTags? = null,
    private val matchingTags: List<Hentai2ReadTag>? = null,
    private val images: List<String>? = null,
) {
    fun toMangasPage(): MangasPage {
        val result = books ?: return MangasPage(emptyList(), false)
        return MangasPage(
            result.data.mapNotNull { it.toManga() },
            (result.page?.intOrNull ?: 1) < (result.lastPage?.intOrNull ?: 1),
        )
    }

    fun toMangaOrNull(): SManga? = book?.toManga()

    fun bookToManga(): SManga = requireNotNull(book) { "Book data not found" }.toMangaOrThrow()

    fun toChapters(): List<SChapter> = chapters.orEmpty().map { it.toSChapter() }

    fun pageImages(): List<String> = images.orEmpty()

    fun tagPage(): Pair<List<Hentai2ReadTag>, Int>? = tags?.let { it.data to it.lastPage }

    fun matchingTagId(name: String): String? {
        val tags = matchingTags.orEmpty()
        return (tags.firstOrNull { it.name.equals(name, ignoreCase = true) } ?: tags.firstOrNull())
            ?.id?.contentOrNull
    }

    fun findBookUrl(title: String): String? {
        val manga = books?.data.orEmpty()
        return (manga.firstOrNull { it.matchesTitle(title) } ?: manga.firstOrNull())?.bookUrl()
    }
}

@Serializable
internal class Hentai2ReadBooks(
    val data: List<Hentai2ReadBook> = emptyList(),
    val page: JsonPrimitive? = null,
    val lastPage: JsonPrimitive? = null,
)

@Serializable
internal class Hentai2ReadBook(
    // Search pages send a plain string; book pages send {"label": ..., "url": ...}
    private val type: JsonElement? = null,
    private val isVideo: Boolean? = null,
    private val url: String? = null,
    private val title: String? = null,
    private val cover: String? = null,
    private val artist: Hentai2ReadArtist? = null,
    private val groups: List<Hentai2ReadGroup> = emptyList(),
    private val tags: List<Hentai2ReadTag> = emptyList(),
    private val alt: String? = null,
    private val description: String? = null,
    private val status: Hentai2ReadStatus? = null,
) {
    fun toManga(): SManga? {
        if (isVideo == true || (type as? JsonPrimitive)?.content == "video") return null
        val bookUrl = url ?: return null
        val bookTitle = title ?: return null
        val artistName = artist
            ?.takeIf { it.id?.intOrNull != UNKNOWN_ARTIST_ID }
            ?.name
        return SManga.create().apply {
            this.url = bookUrl
            this.title = bookTitle
            thumbnail_url = cover
            author = artistName
            artist = artistName
        }
    }

    fun toMangaOrThrow(): SManga {
        val mangaUrl = requireNotNull(url) { "Book URL not found" }
        val mangaTitle = requireNotNull(title) { "Book title not found" }
        val artists = groupNames("artist").filter { it != "Unknown" }
        val genres = tags
            .filter { it.type == "category" || it.type == "content" }
            .mapNotNull { it.name }
        val sections = buildList {
            alt?.takeIf { it.isNotBlank() && it != "-" }?.let { add("Alternative Title:\n$it") }
            description?.takeIf { it.isNotBlank() }?.let(::add)
            listOf("parody" to "Parody", "character" to "Character", "language" to "Language").forEach { (type, label) ->
                val names = groupNames(type)
                if (names.isNotEmpty()) add("$label:\n${names.joinToString()}")
            }
        }

        return SManga.create().apply {
            url = mangaUrl
            title = mangaTitle
            thumbnail_url = cover
            author = artists.joinToString().ifEmpty { null }
            artist = author
            genre = genres.joinToString().ifEmpty { null }
            description = sections.joinToString("\n\n").ifEmpty { null }
            status = when (this@Hentai2ReadBook.status?.label) {
                "Ongoing" -> SManga.ONGOING
                "Completed" -> SManga.COMPLETED
                else -> SManga.UNKNOWN
            }
        }
    }

    fun matchesTitle(value: String): Boolean = title.equals(value, ignoreCase = true)

    fun bookUrl(): String? = url

    private fun groupNames(type: String): List<String> = groups
        .filter { it.type == type }
        .flatMap { it.tags }
        .mapNotNull { it.name }

    private companion object {
        const val UNKNOWN_ARTIST_ID = 2118
    }
}

@Serializable
internal class Hentai2ReadArtist(
    val id: JsonPrimitive? = null,
    val name: String? = null,
)

@Serializable
internal class Hentai2ReadGroup(
    val type: String? = null,
    val tags: List<Hentai2ReadTag> = emptyList(),
)

@Serializable
internal class Hentai2ReadTags(
    val data: List<Hentai2ReadTag> = emptyList(),
    val page: Int = 1,
    val lastPage: Int = 1,
)

@Serializable
internal class Hentai2ReadTag(
    val id: JsonPrimitive? = null,
    val name: String? = null,
    val type: String? = null,
)

@Serializable
internal class Hentai2ReadStatus(
    val label: String? = null,
)

@Serializable
internal class Hentai2ReadChapter(
    private val url: String? = null,
    private val isMembers: Boolean? = null,
    private val title: String? = null,
    private val number: JsonPrimitive? = null,
    private val date: String? = null,
) {
    fun toSChapter(): SChapter {
        val chapterUrl = requireNotNull(url) { "Chapter URL not found" }
        val chapterNumber = number?.contentOrNull
        return SChapter.create().apply {
            url = chapterUrl
            name = (if (isMembers == true) "\uD83D\uDD12 " else "") + (title ?: "Chapter $chapterNumber")
            chapter_number = chapterNumber?.toFloatOrNull() ?: -1f
            date_upload = chapterDateFormat.tryParseDate(date)
        }
    }

    private companion object {
        val chapterDateFormat = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)
    }
}
