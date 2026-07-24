package com.example.vida.data.repository

import com.example.vida.data.remote.VidaApi
import com.example.vida.data.remote.model.CreateFeedPostRequest
import com.example.vida.data.remote.model.FeedCommentRequest
import com.example.vida.data.remote.model.UpdateFeedPostRequest
import com.example.vida.data.remote.model.asDomainModel
import com.example.vida.domain.model.FeedComments
import com.example.vida.domain.model.FeedPost
import com.example.vida.domain.repository.FeedPostLike
import com.example.vida.domain.repository.FeedRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DefaultFeedRepository @Inject constructor(
    private val api: VidaApi,
) : FeedRepository {
    override suspend fun getPosts() = api.getFeedPosts().map { it.asDomainModel() }

    override suspend fun createPost(
        caption: String,
        categories: List<String>,
        durationMinutes: Int,
        image: String?,
        groupId: Long?,
    ): FeedPost = api.createFeedPost(
        CreateFeedPostRequest(caption, categories, durationMinutes, image, groupId),
    ).asDomainModel()

    override suspend fun updatePost(postId: Long, caption: String) =
        api.updateFeedPost(postId, UpdateFeedPostRequest(caption)).asDomainModel()

    override suspend fun deletePost(postId: Long) = api.deleteFeedPost(postId)

    override suspend fun setLiked(postId: Long, liked: Boolean): FeedPostLike {
        val response = if (liked) api.likeFeedPost(postId) else api.unlikeFeedPost(postId)
        return FeedPostLike(response.postId, response.likesCount, response.likedByMe)
    }

    override suspend fun getComments(postId: Long): FeedComments =
        api.getFeedComments(postId).asDomainModel()

    override suspend fun createComment(postId: Long, body: String): FeedComments {
        api.createFeedComment(postId, FeedCommentRequest(body))
        return getComments(postId)
    }
}
