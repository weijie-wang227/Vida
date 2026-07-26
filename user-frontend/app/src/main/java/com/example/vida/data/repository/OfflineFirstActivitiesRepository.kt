package com.example.vida.data.repository

import androidx.room.withTransaction
import com.example.vida.data.local.VidaDatabase
import com.example.vida.data.local.entity.ActivityEntity
import com.example.vida.data.local.entity.asDomainModel
import com.example.vida.data.remote.VidaApi
import com.example.vida.data.remote.model.ActivityDto
import com.example.vida.domain.model.ActivitySummary
import com.example.vida.domain.model.ActivityDetails
import com.example.vida.domain.model.ActivityFriend
import com.example.vida.domain.model.ActivitySession
import com.example.vida.domain.model.ActivityVendor
import com.example.vida.domain.model.AvailableTag
import com.example.vida.domain.model.JoinedActivitySession
import com.example.vida.domain.repository.ActivitiesRepository
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map

@Singleton
class OfflineFirstActivitiesRepository @Inject constructor(
    private val api: VidaApi,
    private val database: VidaDatabase,
) : ActivitiesRepository {
    private val favoriteActivityIds = MutableStateFlow<Set<Long>>(emptySet())

    override fun observeActivities(): Flow<List<ActivitySummary>> =
        database.activityDao().observeAll().map { entities ->
            entities.map { it.asDomainModel() }
        }

    override fun observeFavoriteActivityIds(): Flow<Set<Long>> =
        favoriteActivityIds.asStateFlow()

    override suspend fun refreshActivities() {
        val activities = api.getActivities().map(ActivityDto::asEntity)

        database.withTransaction {
            database.activityDao().clear()
            database.activityDao().upsertAll(activities)
        }
    }

    override suspend fun fetchActivity(activityId: Long): ActivityDetails =
        api.getActivity(activityId).asDetails()

    override suspend fun joinSession(sessionId: Long): JoinedActivitySession =
        api.joinSession(sessionId).let { response ->
            JoinedActivitySession(
                groupId = response.group.id,
                activity = response.activity.asDetails(),
            )
        }

    override suspend fun fetchActivityCollection(
        collection: String,
    ): List<ActivitySummary> =
        api.getActivityCollection(collection)
            .map { it.asEntity().asDomainModel() }

    override suspend fun fetchFavoriteActivities(): List<ActivitySummary> {
        val activities = api.getFavoriteActivities().map { it.asEntity().asDomainModel() }
        favoriteActivityIds.value = activities.mapTo(linkedSetOf(), ActivitySummary::id)
        return activities
    }

    override suspend fun addFavoriteActivity(activityId: Long) {
        api.addFavoriteActivity(activityId)
        favoriteActivityIds.value = favoriteActivityIds.value + activityId
    }

    override suspend fun removeFavoriteActivity(activityId: Long) {
        api.removeFavoriteActivity(activityId)
        favoriteActivityIds.value = favoriteActivityIds.value - activityId
    }

    override suspend fun fetchAvailableTags(): List<AvailableTag> =
        api.getAvailableTags()
            .mapNotNull { tag ->
                val name = tag.name.trim()
                if (name.isEmpty()) {
                    null
                } else {
                    AvailableTag(
                        id = tag.id,
                        name = name,
                        imageUrl = tag.imageUrl.trim(),
                    )
                }
            }
}

private fun ActivityDto.asEntity() = ActivityEntity(
    id = id,
    title = title,
    host = host,
    startsAt = startsAt,
    location = location,
    coverUrl = cover,
    isPremium = isPremium,
    tags = tags,
)

private fun ActivityDto.asDetails() = ActivityDetails(
    id = id,
    title = title,
    description = description,
    host = host,
    durationMinutes = durationMinutes,
    categories = categories,
    tags = tags,
    credits = credits,
    isPremium = isPremium,
    skillsFuturePayable = skillsFuturePayable,
    coverUrl = cover,
    vendor = vendor?.let {
        ActivityVendor(
            id = it.id,
            name = it.name,
            profileUrl = it.profileUrl,
            description = it.description,
        )
    },
    sessions = sessions.map { session ->
        ActivitySession(
            id = session.id,
            title = session.title,
            startsAt = session.startsAt,
            location = session.location,
            durationMinutes = session.durationMinutes,
            spots = session.spots,
            registeredCount = session.registeredCount,
            groupId = session.groupId,
            isOpen = session.isOpen,
            isActive = session.isActive,
            participatingFriends = session.participatingFriends.map { friend ->
                ActivityFriend(
                    id = friend.id,
                    name = friend.name,
                    handle = friend.handle,
                    avatarUrl = friend.avatar,
                )
            },
        )
    },
    participatingFriends = participatingFriends.map {
        ActivityFriend(
            id = it.id,
            name = it.name,
            handle = it.handle,
            avatarUrl = it.avatar,
        )
    },
    joinDisabledReason = joinDisabledReason,
)
