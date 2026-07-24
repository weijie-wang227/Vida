package com.example.vida.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vida.domain.model.Friend
import com.example.vida.domain.model.UserProfile
import com.example.vida.domain.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ProfileUiState(
    val profile: UserProfile? = null,
    val friends: List<Friend> = emptyList(),
    val searchResults: List<Friend> = emptyList(),
    val isLoading: Boolean = true,
    val isSearching: Boolean = false,
    val isSaving: Boolean = false,
    val busyFriendId: String? = null,
    val errorMessage: String? = null,
    val feedback: String? = null,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val repository: ProfileRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()
    private var searchJob: Job? = null

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        runCatching { repository.getProfile() to repository.getFriends() }
            .onSuccess { (profile, friends) -> _uiState.update { it.copy(profile = profile, friends = friends, isLoading = false) } }
            .onFailure { error -> _uiState.update { it.copy(isLoading = false, errorMessage = error.message ?: "Unable to load profile") } }
    }

    fun search(query: String) {
        searchJob?.cancel()
        val trimmed = query.trim()
        if (trimmed.length < 2) {
            _uiState.update { it.copy(searchResults = emptyList(), isSearching = false) }
            return
        }
        searchJob = viewModelScope.launch {
            delay(300)
            _uiState.update { it.copy(isSearching = true, errorMessage = null) }
            runCatching { repository.searchFriends(trimmed) }
                .onSuccess { results -> _uiState.update { it.copy(searchResults = results, isSearching = false) } }
                .onFailure { error -> _uiState.update { it.copy(isSearching = false, errorMessage = error.message ?: "Unable to search users") } }
        }
    }

    fun addFriend(friend: Friend) = viewModelScope.launch {
        _uiState.update { it.copy(busyFriendId = friend.id, feedback = null) }
        runCatching { repository.addFriend(friend.id) }
            .onSuccess { added ->
                _uiState.update { state ->
                    state.copy(
                        friends = (state.friends + added).distinctBy(Friend::id),
                        busyFriendId = null,
                        feedback = "${added.name} added successfully.",
                    )
                }
            }
            .onFailure { error -> _uiState.update { it.copy(busyFriendId = null, errorMessage = error.message ?: "Unable to add friend") } }
    }

    fun removeFriend(friend: Friend) = viewModelScope.launch {
        _uiState.update { it.copy(busyFriendId = friend.id, feedback = null) }
        runCatching { repository.removeFriend(friend.id) }
            .onSuccess { _uiState.update { it.copy(friends = it.friends.filterNot { item -> item.id == friend.id }, busyFriendId = null, feedback = "${friend.name} removed.") } }
            .onFailure { error -> _uiState.update { it.copy(busyFriendId = null, errorMessage = error.message ?: "Unable to remove friend") } }
    }

    fun saveProfile(name: String, handle: String, bio: String, avatar: String?, onDone: () -> Unit) {
        if (name.isBlank() || handle.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, errorMessage = null) }
            runCatching { repository.updateProfile(name.trim(), handle.trim(), bio.trim(), avatar?.trim()) }
                .onSuccess { profile ->
                    _uiState.update { it.copy(profile = profile, isSaving = false, feedback = "Profile updated.") }
                    onDone()
                }
                .onFailure { error -> _uiState.update { it.copy(isSaving = false, errorMessage = error.message ?: "Unable to update profile") } }
        }
    }

    fun clearMessage() = _uiState.update { it.copy(errorMessage = null, feedback = null) }
}
