package com.example.vida.domain.repository

import com.example.vida.domain.model.SettingsPreferences

interface SettingsRepository {
    suspend fun getSettings(): SettingsPreferences
    suspend fun updateSettings(preferences: SettingsPreferences): SettingsPreferences
}
