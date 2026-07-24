package com.example.vida.data.remote.model

import kotlinx.serialization.Serializable

@Serializable
data class ActivityDto(
    val id: Long,
    val title: String,
    val host: String = "",
    val startsAt: String = "",
    val location: String = "",
    val cover: String? = null,
    val isPremium: Boolean = false,
    val tags: List<String> = emptyList(),
)

@Serializable
data class FavoriteActivityResponseDto(
    val activityId: Long,
    val favourited: Boolean,
)
