package com.example.vida.feature.groups

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vida.domain.model.ChatMessage
import com.example.vida.domain.model.GroupChat
import com.example.vida.domain.repository.GroupsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class GroupsUiState(
    val groups: List<GroupChat> = emptyList(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
)

@HiltViewModel
class GroupsViewModel @Inject constructor(
    private val repository: GroupsRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(GroupsUiState())
    val uiState: StateFlow<GroupsUiState> = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        runCatching { repository.getGroups() }
            .onSuccess { groups -> _uiState.update { it.copy(groups = groups, isLoading = false) } }
            .onFailure { error -> _uiState.update { it.copy(isLoading = false, errorMessage = error.message ?: "Unable to load groups") } }
    }
}

data class GroupDetailUiState(
    val group: GroupChat? = null,
    val messages: List<ChatMessage> = emptyList(),
    val isLoading: Boolean = true,
    val isSending: Boolean = false,
    val votingMessageId: String? = null,
    val errorMessage: String? = null,
)

@HiltViewModel
class GroupDetailViewModel @Inject constructor(
    private val repository: GroupsRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(GroupDetailUiState())
    val uiState: StateFlow<GroupDetailUiState> = _uiState.asStateFlow()
    private var loadedGroupId: Long? = null

    fun open(groupId: Long) {
        if (loadedGroupId == groupId) return
        loadedGroupId = groupId
        refresh()
    }

    fun refresh() {
        val groupId = loadedGroupId ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            runCatching { repository.getGroup(groupId) to repository.getMessages(groupId) }
                .onSuccess { (group, messages) -> _uiState.update { it.copy(group = group, messages = messages, isLoading = false) } }
                .onFailure { error -> _uiState.update { it.copy(isLoading = false, errorMessage = error.message ?: "Unable to load messages") } }
        }
    }

    fun send(text: String, onDone: () -> Unit) {
        val groupId = loadedGroupId ?: return
        if (text.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true, errorMessage = null) }
            runCatching { repository.sendMessage(groupId, text.trim()) }
                .onSuccess { message ->
                    _uiState.update { it.copy(messages = it.messages + message, isSending = false) }
                    onDone()
                }
                .onFailure { error -> _uiState.update { it.copy(isSending = false, errorMessage = error.message ?: "Unable to send message") } }
        }
    }

    fun vote(messageId: String, optionId: String) {
        val groupId = loadedGroupId ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(votingMessageId = messageId, errorMessage = null) }
            runCatching { repository.vote(groupId, messageId, optionId) }
                .onSuccess { updated ->
                    _uiState.update { state ->
                        state.copy(
                            messages = state.messages.map { if (it.id == updated.id) updated else it },
                            votingMessageId = null,
                        )
                    }
                }
                .onFailure { error -> _uiState.update { it.copy(votingMessageId = null, errorMessage = error.message ?: "Unable to record vote") } }
        }
    }
}
