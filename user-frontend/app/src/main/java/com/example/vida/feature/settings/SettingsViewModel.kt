package com.example.vida.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vida.domain.model.SettingsPreferences
import com.example.vida.domain.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SettingsUiState(
    val preferences: SettingsPreferences = SettingsPreferences(),
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val repository: SettingsRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            runCatching { repository.getSettings() }
                .onSuccess { preferences ->
                    _uiState.update {
                        it.copy(
                            preferences = preferences,
                            isLoading = false,
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = error.message ?: "Unable to load settings.",
                        )
                    }
                }
        }
    }

    fun setActivityReminders(enabled: Boolean) {
        save(_uiState.value.preferences.copy(activityReminders = enabled))
    }

    fun setFriendDiscovery(enabled: Boolean) {
        save(_uiState.value.preferences.copy(friendDiscovery = enabled))
    }

    fun setPrivateActivityHistory(enabled: Boolean) {
        save(_uiState.value.preferences.copy(privateActivityHistory = enabled))
    }

    private fun save(preferences: SettingsPreferences) {
        if (_uiState.value.isSaving) return

        val previousPreferences = _uiState.value.preferences
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    preferences = preferences,
                    isSaving = true,
                    errorMessage = null,
                )
            }
            runCatching { repository.updateSettings(preferences) }
                .onSuccess { savedPreferences ->
                    _uiState.update {
                        it.copy(
                            preferences = savedPreferences,
                            isSaving = false,
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            preferences = previousPreferences,
                            isSaving = false,
                            errorMessage = error.message ?: "Unable to save settings.",
                        )
                    }
                }
        }
    }
}
