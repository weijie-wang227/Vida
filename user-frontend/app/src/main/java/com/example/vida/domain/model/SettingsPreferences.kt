package com.example.vida.domain.model

enum class AppearanceMode(val storageValue: String) {
    Light("light"),
    Dark("dark"),
}

data class SettingsPreferences(
    val activityReminders: Boolean = true,
    val friendDiscovery: Boolean = true,
    val privateActivityHistory: Boolean = false,
)
