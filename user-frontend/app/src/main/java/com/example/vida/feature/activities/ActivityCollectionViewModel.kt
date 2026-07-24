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

data class ActivityCollectionUiState(
    val activities: List<ActivitySummary> = emptyList(),
    val favoriteActivityIds: Set<Long> = emptySet(),
    val favoriteMutationIds: Set<Long> = emptySet(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
)

@HiltViewModel
class ActivityCollectionViewModel @Inject constructor(
    private val repository: ActivitiesRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(ActivityCollectionUiState())
    val uiState: StateFlow<ActivityCollectionUiState> = _uiState.asStateFlow()
    private var collection: ActivityCollection? = null

    init {
        viewModelScope.launch {
            repository.observeFavoriteActivityIds().collect { activityIds ->
                _uiState.update { it.copy(favoriteActivityIds = activityIds) }
            }
        }
    }

    fun load(selectedCollection: ActivityCollection) {
        if (collection == selectedCollection) {
            return
        }

        collection = selectedCollection
        refresh()
    }

    fun refresh() {
        val selectedCollection = collection ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            val activitiesResult = runCatching {
                repository.fetchActivityCollection(selectedCollection.routeValue)
            }
            val favoritesResult = runCatching {
                repository.fetchFavoriteActivities()
            }

            _uiState.update {
                it.copy(
                    activities = activitiesResult.getOrDefault(it.activities),
                    isLoading = false,
                    errorMessage = activitiesResult.exceptionOrNull()?.message
                        ?: favoritesResult.exceptionOrNull()?.message
                        ?: if (activitiesResult.isFailure) {
                            "Unable to load ${selectedCollection.title.lowercase()}"
                        } else if (favoritesResult.isFailure) {
                            "Unable to load favorited activities"
                        } else {
                            null
                        },
                )
            }
        }
    }

    fun toggleFavorite(activity: ActivitySummary) {
        val activityId = activity.id
        val current = _uiState.value

        if (activityId in current.favoriteMutationIds) {
            return
        }

        val wasFavorited = activityId in current.favoriteActivityIds
        _uiState.update {
            it.copy(
                favoriteActivityIds = if (wasFavorited) {
                    it.favoriteActivityIds - activityId
                } else {
                    it.favoriteActivityIds + activityId
                },
                favoriteMutationIds = it.favoriteMutationIds + activityId,
                errorMessage = null,
            )
        }

        viewModelScope.launch {
            val result = runCatching {
                if (wasFavorited) {
                    repository.removeFavoriteActivity(activityId)
                } else {
                    repository.addFavoriteActivity(activityId)
                }
            }

            _uiState.update {
                it.copy(
                    favoriteActivityIds = if (result.isFailure) {
                        if (wasFavorited) {
                            it.favoriteActivityIds + activityId
                        } else {
                            it.favoriteActivityIds - activityId
                        }
                    } else {
                        it.favoriteActivityIds
                    },
                    favoriteMutationIds = it.favoriteMutationIds - activityId,
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
