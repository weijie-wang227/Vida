package com.example.vida.domain.repository

import com.example.vida.domain.model.ActivitySummary
import kotlinx.coroutines.flow.Flow

interface ActivitiesRepository {
    fun observeActivities(): Flow<List<ActivitySummary>>
    suspend fun refreshActivities()
}
