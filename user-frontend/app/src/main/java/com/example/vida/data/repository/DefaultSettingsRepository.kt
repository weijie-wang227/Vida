package com.example.vida.data.repository

import com.example.vida.data.remote.VidaApi
import com.example.vida.data.remote.model.UpdateSettingsRequestDto
import com.example.vida.data.remote.model.asDomainModel
import com.example.vida.data.remote.model.asDto
import com.example.vida.domain.model.SettingsPreferences
import com.example.vida.domain.repository.SettingsRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DefaultSettingsRepository @Inject constructor(
    private val api: VidaApi,
) : SettingsRepository {
    override suspend fun getSettings() =
        api.getSettings().preferences.asDomainModel()

    override suspend fun updateSettings(preferences: SettingsPreferences) =
        api.updateSettings(
            UpdateSettingsRequestDto(preferences.asDto()),
        ).preferences.asDomainModel()
}
