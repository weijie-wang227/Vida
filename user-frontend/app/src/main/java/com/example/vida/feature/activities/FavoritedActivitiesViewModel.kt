package com.example.vida.feature.activities

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vida.domain.model.ActivitySummary
import com.example.vida.domain.repository.ActivitiesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class FavoritedActivitiesUiState(
    val activities: List<ActivitySummary> = emptyList(),
    val favoriteMutationIds: Set<Long> = emptySet(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
)

@HiltViewModel
class FavoritedActivitiesViewModel @Inject constructor(
    private val repository: ActivitiesRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(FavoritedActivitiesUiState())
    val uiState: StateFlow<FavoritedActivitiesUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            val result = runCatching { repository.fetchFavoriteActivities() }

            _uiState.update {
                it.copy(
                    activities = result.getOrDefault(it.activities),
                    isLoading = false,
                    errorMessage = result.exceptionOrNull()?.message
                        ?: if (result.isFailure) {
                            "Unable to load favorited activities"
                        } else {
                            null
                        },
                )
            }
        }
    }

    fun removeFavorite(activity: ActivitySummary) {
        if (activity.id in _uiState.value.favoriteMutationIds) {
            return
        }

        _uiState.update {
            it.copy(
                favoriteMutationIds = it.favoriteMutationIds + activity.id,
                errorMessage = null,
            )
        }

        viewModelScope.launch {
            val result = runCatching {
                repository.removeFavoriteActivity(activity.id)
            }

            _uiState.update {
                it.copy(
                    activities = if (result.isSuccess) {
                        it.activities.filterNot { item -> item.id == activity.id }
                    } else {
                        it.activities
                    },
                    favoriteMutationIds = it.favoriteMutationIds - activity.id,
                    errorMessage = result.exceptionOrNull()?.message
                        ?: if (result.isFailure) {
                            "Unable to update favorited activities"
                        } else {
                            null
                        },
                )
            }
        }
    }
}
