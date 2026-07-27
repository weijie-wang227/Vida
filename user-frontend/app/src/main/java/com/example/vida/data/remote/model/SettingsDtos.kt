package com.example.vida.data.remote.model

import com.example.vida.domain.model.SettingsPreferences
import kotlinx.serialization.Serializable

@Serializable
data class SettingsPreferencesDto(
    val activityReminders: Boolean = true,
    val friendDiscovery: Boolean = true,
    val privateActivityHistory: Boolean = false,
)

@Serializable
data class SettingsResponseDto(
    val preferences: SettingsPreferencesDto,
)

@Serializable
data class UpdateSettingsRequestDto(
    val preferences: SettingsPreferencesDto,
)

fun SettingsPreferencesDto.asDomainModel() = SettingsPreferences(
    activityReminders = activityReminders,
    friendDiscovery = friendDiscovery,
    privateActivityHistory = privateActivityHistory,
)

fun SettingsPreferences.asDto() = SettingsPreferencesDto(
    activityReminders = activityReminders,
    friendDiscovery = friendDiscovery,
    privateActivityHistory = privateActivityHistory,
)
