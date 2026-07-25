package com.example.vida.feature.activities

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vida.domain.model.ActivityDetails
import com.example.vida.domain.repository.ActivitiesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ActivityDetailUiState(
    val activity: ActivityDetails? = null,
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val isFavorited: Boolean = false,
    val isFavoriteMutationInProgress: Boolean = false,
    val joiningSessionId: Long? = null,
    val actionErrorMessage: String? = null,
    val joinedGroupId: Long? = null,
)

@HiltViewModel
class ActivityDetailViewModel @Inject constructor(
    private val repository: ActivitiesRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(ActivityDetailUiState())
    val uiState: StateFlow<ActivityDetailUiState> = _uiState.asStateFlow()
    private var openedActivityId: Long? = null
    private var favoriteActivityIds: Set<Long> = emptySet()

    init {
        viewModelScope.launch {
            repository.observeFavoriteActivityIds().collect { favoriteIds ->
                favoriteActivityIds = favoriteIds
                _uiState.update { state ->
                    state.copy(
                        isFavorited = state.activity?.id in favoriteIds,
                    )
                }
            }
        }
    }

    fun open(activityId: Long) {
        if (openedActivityId == activityId && _uiState.value.activity != null) {
            return
        }

        openedActivityId = activityId
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    activity = null,
                    isLoading = true,
                    errorMessage = null,
                    actionErrorMessage = null,
                )
            }

            runCatching { repository.fetchActivity(activityId) }
                .onSuccess { activity ->
                    _uiState.update {
                        it.copy(
                            activity = activity,
                            isLoading = false,
                            errorMessage = null,
                            isFavorited = activity.id in favoriteActivityIds,
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = error.message ?: "Activity not found.",
                        )
                    }
                }
        }
    }

    fun retry() {
        openedActivityId?.let { activityId ->
            openedActivityId = null
            open(activityId)
        }
    }

    fun toggleFavorite() {
        val activity = _uiState.value.activity ?: return
        val wasFavorited = _uiState.value.isFavorited

        if (_uiState.value.isFavoriteMutationInProgress) {
            return
        }

        _uiState.update {
            it.copy(
                isFavorited = !wasFavorited,
                isFavoriteMutationInProgress = true,
                actionErrorMessage = null,
            )
        }

        viewModelScope.launch {
            val result = runCatching {
                if (wasFavorited) {
                    repository.removeFavoriteActivity(activity.id)
                } else {
                    repository.addFavoriteActivity(activity.id)
                }
            }

            _uiState.update {
                it.copy(
                    isFavorited = if (result.isFailure) wasFavorited else it.isFavorited,
                    isFavoriteMutationInProgress = false,
                    actionErrorMessage = result.exceptionOrNull()?.message
                        ?: if (result.isFailure) {
                            "Unable to update favorited activities."
                        } else {
                            null
                        },
                )
            }
        }
    }

    fun joinSession(sessionId: Long) {
        val state = _uiState.value

        if (state.joiningSessionId != null || state.activity?.joinDisabledReason != null) {
            return
        }

        _uiState.update {
            it.copy(
                joiningSessionId = sessionId,
                actionErrorMessage = null,
            )
        }

        viewModelScope.launch {
            runCatching { repository.joinSession(sessionId) }
                .onSuccess { joined ->
                    _uiState.update {
                        it.copy(
                            activity = joined.activity,
                            joiningSessionId = null,
                            joinedGroupId = joined.groupId,
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            joiningSessionId = null,
                            actionErrorMessage = error.message ?: "Unable to join session.",
                        )
                    }
                }
        }
    }

    fun showActionError(message: String) {
        _uiState.update { it.copy(actionErrorMessage = message) }
    }

    fun consumeJoinedGroup() {
        _uiState.update { it.copy(joinedGroupId = null) }
    }
}
