package com.example.vida.data.repository

import androidx.room.withTransaction
import com.example.vida.data.local.VidaDatabase
import com.example.vida.data.local.entity.ActivityEntity
import com.example.vida.data.local.entity.asDomainModel
import com.example.vida.data.remote.VidaApi
import com.example.vida.domain.model.ActivitySummary
import com.example.vida.domain.repository.ActivitiesRepository
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class OfflineFirstActivitiesRepository @Inject constructor(
    private val api: VidaApi,
    private val database: VidaDatabase,
) : ActivitiesRepository {
    override fun observeActivities(): Flow<List<ActivitySummary>> =
        database.activityDao().observeAll().map { entities ->
            entities.map { it.asDomainModel() }
        }

    override suspend fun refreshActivities() {
        val activities = api.getActivities().map { activity ->
            ActivityEntity(
                id = activity.id,
                title = activity.title,
                host = activity.host,
                startsAt = activity.startsAt,
                location = activity.location,
                coverUrl = activity.cover,
                isPremium = activity.isPremium,
                tags = activity.tags,
            )
        }

        database.withTransaction {
            database.activityDao().clear()
            database.activityDao().upsertAll(activities)
        }
    }

    override suspend fun fetchAvailableTags(): List<String> =
        api.getAvailableTags()
            .map { it.name.trim() }
            .filter { it.isNotEmpty() }
}
