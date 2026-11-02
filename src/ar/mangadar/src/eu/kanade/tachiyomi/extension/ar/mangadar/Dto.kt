package eu.kanade.tachiyomi.extension.ar.mangadar

import kotlinx.serialization.Serializable

@Serializable
class SearchResponse(
    val success: Boolean = false,
    val data: List<SearchMangaItemDto> = emptyList(),
)

@Serializable
class SearchMangaItemDto(
    val id: Int,
    val title: String,
    val url: String,
    val cover: String,
)
