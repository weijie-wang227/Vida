package com.example.vida.domain.repository

import com.example.vida.domain.model.ActivitySummary
import kotlinx.coroutines.flow.Flow

interface ActivitiesRepository {
    fun observeActivities(): Flow<List<ActivitySummary>>
    fun observeFavoriteActivityIds(): Flow<Set<Long>>
    suspend fun refreshActivities()
    suspend fun fetchActivityCollection(collection: String): List<ActivitySummary>
    suspend fun fetchFavoriteActivities(): List<ActivitySummary>
    suspend fun addFavoriteActivity(activityId: Long)
    suspend fun removeFavoriteActivity(activityId: Long)
    suspend fun fetchAvailableTags(): List<String>
}
