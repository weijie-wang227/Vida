package com.example.vida.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vida.core.storage.AppPreferencesStore
import com.example.vida.domain.model.AppearanceMode
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class AppearanceViewModel @Inject constructor(
    private val preferencesStore: AppPreferencesStore,
) : ViewModel() {
    val appearanceMode: StateFlow<AppearanceMode> = preferencesStore.appearanceMode.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = AppearanceMode.Dark,
    )

    fun updateAppearanceMode(mode: AppearanceMode) {
        viewModelScope.launch {
            preferencesStore.saveAppearanceMode(mode)
        }
    }
}
