package com.example.vida.feature.activities

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vida.domain.repository.ActivitiesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class ActivitiesViewModel @Inject constructor(
    private val repository: ActivitiesRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(ActivitiesUiState())
    val uiState: StateFlow<ActivitiesUiState> = _uiState.asStateFlow()

    init {
        observeCachedActivities()
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    errorMessage = null,
                    tagsErrorMessage = null,
                )
            }

            val tagsResult = runCatching { repository.fetchAvailableTags() }
            val activitiesResult = runCatching { repository.refreshActivities() }

            _uiState.update { current ->
                current.copy(
                    availableTags = tagsResult.getOrDefault(current.availableTags),
                    isLoading = false,
                    errorMessage = activitiesResult.exceptionOrNull()?.message
                        ?: if (activitiesResult.isFailure) "Unable to load activities" else null,
                    tagsErrorMessage = tagsResult.exceptionOrNull()?.message
                        ?: if (tagsResult.isFailure) "Unable to load activity tags" else null,
                )
            }
        }
    }

    private fun observeCachedActivities() {
        viewModelScope.launch {
            repository.observeActivities().collect { activities ->
                _uiState.update {
                    it.copy(
                        activities = activities,
                        isLoading = false,
                    )
                }
            }
        }
    }
}
