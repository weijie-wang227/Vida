package com.example.vida.feature.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vida.domain.repository.FeedRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class FeedViewModel @Inject constructor(
    private val repository: FeedRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(FeedUiState())
    val uiState: StateFlow<FeedUiState> = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            runCatching { repository.getPosts() }
                .onSuccess { posts -> _uiState.update { it.copy(posts = posts, isLoading = false) } }
                .onFailure { error -> fail(error, loading = false) }
        }
    }

    fun createPost(caption: String, categories: List<String>, durationMinutes: Int, onDone: () -> Unit) {
        if (caption.isBlank() || categories.isEmpty() || durationMinutes <= 0) return
        viewModelScope.launch {
            _uiState.update { it.copy(isPosting = true, errorMessage = null) }
            runCatching { repository.createPost(caption.trim(), categories, durationMinutes) }
                .onSuccess { post ->
                    _uiState.update { it.copy(posts = listOf(post) + it.posts, isPosting = false) }
                    onDone()
                }
                .onFailure { error -> fail(error, posting = false) }
        }
    }

    fun toggleLike(post: com.example.vida.domain.model.FeedPost) {
        viewModelScope.launch {
            runCatching { repository.setLiked(post.id, !post.likedByMe) }
                .onSuccess { result ->
                    _uiState.update { state ->
                        state.copy(posts = state.posts.map {
                            if (it.id == result.postId) it.copy(
                                likesCount = result.likesCount,
                                likedByMe = result.likedByMe,
                            ) else it
                        })
                    }
                }
                .onFailure(::fail)
        }
    }

    fun openComments(post: com.example.vida.domain.model.FeedPost) {
        _uiState.update { it.copy(selectedPost = post, comments = emptyList(), isLoadingComments = true) }
        viewModelScope.launch {
            runCatching { repository.getComments(post.id) }
                .onSuccess { result ->
                    _uiState.update { it.copy(comments = result.comments, isLoadingComments = false) }
                }
                .onFailure { error -> fail(error, commentsLoading = false) }
        }
    }

    fun closeComments() = _uiState.update {
        it.copy(selectedPost = null, comments = emptyList(), isLoadingComments = false)
    }

    fun sendComment(body: String, onDone: () -> Unit) {
        val postId = _uiState.value.selectedPost?.id ?: return
        if (body.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(isSendingComment = true, errorMessage = null) }
            runCatching { repository.createComment(postId, body.trim()) }
                .onSuccess { result ->
                    _uiState.update { state ->
                        state.copy(
                            comments = result.comments,
                            isSendingComment = false,
                            posts = state.posts.map {
                                if (it.id == postId) it.copy(comments = result.commentCount) else it
                            },
                        )
                    }
                    onDone()
                }
                .onFailure { error -> fail(error, sendingComment = false) }
        }
    }

    fun updatePost(postId: Long, caption: String, onDone: () -> Unit) {
        if (caption.isBlank()) return
        viewModelScope.launch {
            runCatching { repository.updatePost(postId, caption.trim()) }
                .onSuccess { updated ->
                    _uiState.update { state ->
                        state.copy(posts = state.posts.map { if (it.id == updated.id) updated else it })
                    }
                    onDone()
                }
                .onFailure(::fail)
        }
    }

    fun deletePost(postId: Long) {
        viewModelScope.launch {
            runCatching { repository.deletePost(postId) }
                .onSuccess { _uiState.update { it.copy(posts = it.posts.filterNot { post -> post.id == postId }) } }
                .onFailure(::fail)
        }
    }

    fun clearError() = _uiState.update { it.copy(errorMessage = null) }

    private fun fail(
        error: Throwable,
        loading: Boolean? = null,
        posting: Boolean? = null,
        commentsLoading: Boolean? = null,
        sendingComment: Boolean? = null,
    ) {
        _uiState.update {
            it.copy(
                isLoading = loading ?: it.isLoading,
                isPosting = posting ?: it.isPosting,
                isLoadingComments = commentsLoading ?: it.isLoadingComments,
                isSendingComment = sendingComment ?: it.isSendingComment,
                errorMessage = error.message ?: "Something went wrong. Please try again.",
            )
        }
    }
}
