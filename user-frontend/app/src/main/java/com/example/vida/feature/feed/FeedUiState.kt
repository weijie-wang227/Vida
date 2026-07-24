package com.example.vida.feature.feed

import com.example.vida.domain.model.FeedComment
import com.example.vida.domain.model.FeedPost

data class FeedUiState(
    val posts: List<FeedPost> = emptyList(),
    val isLoading: Boolean = true,
    val isPosting: Boolean = false,
    val errorMessage: String? = null,
    val selectedPost: FeedPost? = null,
    val comments: List<FeedComment> = emptyList(),
    val isLoadingComments: Boolean = false,
    val isSendingComment: Boolean = false,
)
