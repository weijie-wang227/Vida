package com.example.vida.domain.repository

import com.example.vida.domain.model.ActivitySummary
import com.example.vida.domain.model.ActivityDetails
import com.example.vida.domain.model.AvailableTag
import com.example.vida.domain.model.JoinedActivitySession
import kotlinx.coroutines.flow.Flow

interface ActivitiesRepository {
    fun observeActivities(): Flow<List<ActivitySummary>>
    fun observeFavoriteActivityIds(): Flow<Set<Long>>
    suspend fun refreshActivities()
    suspend fun fetchActivity(activityId: Long): ActivityDetails
    suspend fun joinSession(sessionId: Long): JoinedActivitySession
    suspend fun fetchActivityCollection(collection: String): List<ActivitySummary>
    suspend fun fetchFavoriteActivities(): List<ActivitySummary>
    suspend fun addFavoriteActivity(activityId: Long)
    suspend fun removeFavoriteActivity(activityId: Long)
    suspend fun fetchAvailableTags(): List<AvailableTag>
}
