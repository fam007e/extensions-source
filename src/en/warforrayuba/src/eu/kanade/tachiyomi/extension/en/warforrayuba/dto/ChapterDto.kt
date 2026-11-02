package eu.kanade.tachiyomi.extension.en.warforrayuba.dto

import kotlinx.serialization.Serializable

@Serializable
class ChapterDto(
    val title: String,
    val volume: Int,
    val groups: ChapterGroupDto,
    val last_updated: Long,
)

@Serializable
class ChapterGroupDto(
    val primary: String,
)
