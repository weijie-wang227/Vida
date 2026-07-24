package com.example.vida.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.vida.domain.model.ActivitySummary

@Entity(tableName = "activities")
data class ActivityEntity(
    @PrimaryKey val id: Long,
    val title: String,
    val host: String,
    val startsAt: String,
    val location: String,
    val coverUrl: String?,
    val isPremium: Boolean,
    val tags: List<String>,
)

fun ActivityEntity.asDomainModel() = ActivitySummary(
    id = id,
    title = title,
    host = host,
    startsAt = startsAt,
    location = location,
    coverUrl = coverUrl,
    isPremium = isPremium,
    tags = tags,
)
