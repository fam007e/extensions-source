package eu.kanade.tachiyomi.extension.all.manhwa18net

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
class PageDto(
    val props: PropsDto,
)

@Serializable
class PropsDto(
    val paginate: PaginateDto? = null,
    val popularManga: PaginateDto? = null,
    val mangas: PaginateDto? = null,
    val latestManhwaMain: PaginateDto? = null,
    val manga: MangaDto? = null,
    val chapters: List<ChapterDto>? = null,
    val chapterContent: String? = null,
)

@Serializable
class PaginateDto(
    val data: List<MangaDto>,
    @SerialName("next_page_url")
    val nextPageUrl: String? = null,
)

@Serializable
class MangaDto(
    val name: String,
    val slug: String,
    @SerialName("cover_url")
    val coverUrl: String? = null,
    @SerialName("thumb_url")
    val thumbUrl: String? = null,
    val pilot: String? = null,
    val description: String? = null,
    val genres: List<GenreDto>? = null,
    val artists: List<ArtistDto>? = null,
    @SerialName("status_id")
    val statusId: Int? = null,
)

@Serializable
class ChapterDto(
    val name: String,
    val slug: String,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
class GenreDto(
    val name: String,
)

@Serializable
class ArtistDto(
    val name: String,
)
