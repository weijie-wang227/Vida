package com.example.vida.domain.repository

import com.example.vida.domain.model.FeedComments
import com.example.vida.domain.model.FeedPost

interface FeedRepository {
    suspend fun getPosts(): List<FeedPost>
    suspend fun createPost(
        caption: String,
        categories: List<String>,
        durationMinutes: Int,
        image: String? = null,
        groupId: Long? = null,
    ): FeedPost
    suspend fun updatePost(postId: Long, caption: String): FeedPost
    suspend fun deletePost(postId: Long)
    suspend fun setLiked(postId: Long, liked: Boolean): FeedPostLike
    suspend fun getComments(postId: Long): FeedComments
    suspend fun createComment(postId: Long, body: String): FeedComments
}

data class FeedPostLike(val postId: Long, val likesCount: Int, val likedByMe: Boolean)
