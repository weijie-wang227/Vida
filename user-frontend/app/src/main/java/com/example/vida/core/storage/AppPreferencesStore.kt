package com.example.vida.core.storage

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.example.vida.domain.model.AppearanceMode
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class AppPreferencesStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    val appearanceMode: Flow<AppearanceMode> = context.vidaPreferences.data.map { preferences ->
        when (preferences[AppearanceModeKey]) {
            AppearanceMode.Light.storageValue -> AppearanceMode.Light
            else -> AppearanceMode.Dark
        }
    }

    suspend fun saveAppearanceMode(mode: AppearanceMode) {
        context.vidaPreferences.edit { preferences ->
            preferences[AppearanceModeKey] = mode.storageValue
        }
    }

    private companion object {
        val AppearanceModeKey = stringPreferencesKey("appearance_mode")
    }
}
