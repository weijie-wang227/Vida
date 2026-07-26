package com.example.vida.data.remote.model

import kotlinx.serialization.Serializable

@Serializable
data class ActivityDto(
    val id: Long,
    val title: String,
    val description: String = "",
    val host: String = "",
    val startsAt: String = "",
    val location: String = "",
    val durationMinutes: Int = 0,
    val spots: Int = 0,
    val registeredCount: Int = 0,
    val credits: Double = 0.0,
    val categories: List<String> = emptyList(),
    val imageUrls: List<String> = emptyList(),
    val isPremium: Boolean = false,
    val skillsFuturePayable: Boolean = false,
    val tags: List<String> = emptyList(),
    val vendor: ActivityVendorDto? = null,
    val sessions: List<ActivitySessionDto> = emptyList(),
    val participatingFriends: List<ActivityFriendDto> = emptyList(),
    val joinDisabledReason: String? = null,
)

@Serializable
data class ActivitySessionDto(
    val id: Long,
    val startsAt: String = "",
    val location: String = "",
    val durationMinutes: Int = 0,
    val spots: Int = 0,
    val registeredCount: Int = 0,
    val groupId: Long? = null,
    val isOpen: Boolean = true,
    val isActive: Boolean = true,
    val participatingFriends: List<ActivityFriendDto> = emptyList(),
)

@Serializable
data class ActivityFriendDto(
    val id: Long,
    val name: String = "",
    val handle: String = "",
    val avatar: String? = null,
)

@Serializable
data class ActivityVendorDto(
    val id: String,
    val name: String = "",
    val profileUrl: String = "",
    val description: String = "",
)

@Serializable
data class JoinSessionResponseDto(
    val activity: ActivityDto,
    val group: JoinedGroupDto,
)

@Serializable
data class JoinedGroupDto(
    val id: Long,
)

@Serializable
data class FavoriteActivityResponseDto(
    val activityId: Long,
    val favourited: Boolean,
)
