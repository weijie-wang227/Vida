package com.example.vida.core.storage

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.vidaPreferences by preferencesDataStore(name = "vida_preferences")

@Singleton
class TokenStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    val authToken: Flow<String?> = context.vidaPreferences.data.map { preferences ->
        preferences[AuthTokenKey]
    }

    suspend fun currentToken(): String? = authToken.first()

    suspend fun saveAuthToken(token: String) {
        context.vidaPreferences.edit { preferences ->
            preferences[AuthTokenKey] = token
        }
    }

    suspend fun clearAuthToken() {
        context.vidaPreferences.edit { preferences ->
            preferences.remove(AuthTokenKey)
        }
    }

    private companion object {
        val AuthTokenKey = stringPreferencesKey("auth_token")
    }
}
