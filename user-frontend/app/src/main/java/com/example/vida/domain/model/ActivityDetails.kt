package com.example.vida.domain.model

data class ActivityDetails(
    val id: Long,
    val title: String,
    val description: String,
    val host: String,
    val durationMinutes: Int,
    val categories: List<String>,
    val tags: List<String>,
    val credits: Double,
    val isPremium: Boolean,
    val skillsFuturePayable: Boolean,
    val coverUrl: String?,
    val vendor: ActivityVendor?,
    val sessions: List<ActivitySession>,
    val participatingFriends: List<ActivityFriend>,
    val joinDisabledReason: String?,
)

data class ActivitySession(
    val id: Long,
    val title: String,
    val startsAt: String,
    val location: String,
    val durationMinutes: Int,
    val spots: Int,
    val registeredCount: Int,
    val groupId: Long?,
    val isOpen: Boolean,
    val isActive: Boolean,
    val participatingFriends: List<ActivityFriend>,
)

data class ActivityFriend(
    val id: Long,
    val name: String,
    val handle: String,
    val avatarUrl: String?,
)

data class ActivityVendor(
    val id: String,
    val name: String,
    val profileUrl: String,
    val description: String,
)

data class JoinedActivitySession(
    val groupId: Long,
    val activity: ActivityDetails,
)
