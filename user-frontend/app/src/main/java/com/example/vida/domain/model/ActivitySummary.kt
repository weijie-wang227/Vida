package com.example.vida.domain.model

data class ActivitySummary(
    val id: Long,
    val title: String,
    val host: String,
    val startsAt: String,
    val location: String,
    val coverUrl: String?,
    val isPremium: Boolean,
)
