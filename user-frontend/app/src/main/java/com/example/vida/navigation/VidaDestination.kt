package com.example.vida.navigation

import kotlinx.serialization.Serializable

@Serializable
data object ActivitiesDestination

@Serializable
data object ActivityCalendarDestination

@Serializable
data class ActivityDetailDestination(val activityId: Long)

@Serializable
data class ActivityReviewDestination(val activityId: Long)

@Serializable
data object FeedDestination

@Serializable
data object GroupsDestination

@Serializable
data class GroupDetailDestination(val groupId: Long)

@Serializable
data object ProfileDestination

@Serializable
data object SettingsDestination
