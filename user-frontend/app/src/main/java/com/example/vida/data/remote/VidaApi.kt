package com.example.vida.data.remote

import com.example.vida.data.remote.model.ActivityDto
import com.example.vida.data.remote.model.AvailableTagDto
import com.example.vida.data.remote.model.AuthResponseDto
import com.example.vida.data.remote.model.ChatMessageDto
import com.example.vida.data.remote.model.CreateFeedPostRequest
import com.example.vida.data.remote.model.CurrentUserResponseDto
import com.example.vida.data.remote.model.FeedCommentRequest
import com.example.vida.data.remote.model.FeedCommentsDto
import com.example.vida.data.remote.model.FeedLikeResponseDto
import com.example.vida.data.remote.model.FeedPostDto
import com.example.vida.data.remote.model.FavoriteActivityResponseDto
import com.example.vida.data.remote.model.FriendDto
import com.example.vida.data.remote.model.GroupChatDto
import com.example.vida.data.remote.model.JoinSessionResponseDto
import com.example.vida.data.remote.model.ProfileDto
import com.example.vida.data.remote.model.SendMessageRequest
import com.example.vida.data.remote.model.SendMessageResponseDto
import com.example.vida.data.remote.model.SignInRequestDto
import com.example.vida.data.remote.model.UpdateFeedPostRequest
import com.example.vida.data.remote.model.UpdateProfileRequest
import com.example.vida.data.remote.model.VoteRequest
import com.example.vida.data.remote.model.VoteResponseDto
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.POST
import retrofit2.http.Query

interface VidaApi {
    @POST("auth/signin")
    suspend fun signIn(@Body request: SignInRequestDto): AuthResponseDto

    @GET("auth/me")
    suspend fun getCurrentUser(): CurrentUserResponseDto

    @GET("activities")
    suspend fun getActivities(): List<ActivityDto>

    @GET("activities/{activityId}")
    suspend fun getActivity(
        @Path("activityId") activityId: Long,
    ): ActivityDto

    @GET("activities/collections/{collection}")
    suspend fun getActivityCollection(
        @Path("collection") collection: String,
    ): List<ActivityDto>

    @GET("activities/favourites")
    suspend fun getFavoriteActivities(): List<ActivityDto>

    @POST("activities/favourites/add/{activityId}")
    suspend fun addFavoriteActivity(
        @Path("activityId") activityId: Long,
    ): FavoriteActivityResponseDto

    @DELETE("activities/favourites/delete/{activityId}")
    suspend fun removeFavoriteActivity(
        @Path("activityId") activityId: Long,
    ): FavoriteActivityResponseDto

    @POST("sessions/{sessionId}/join")
    suspend fun joinSession(
        @Path("sessionId") sessionId: Long,
    ): JoinSessionResponseDto

    @GET("tags")
    suspend fun getAvailableTags(): List<AvailableTagDto>

    @GET("feed")
    suspend fun getFeedPosts(): List<FeedPostDto>

    @POST("feed")
    suspend fun createFeedPost(@Body request: CreateFeedPostRequest): FeedPostDto

    @PATCH("feed/{postId}")
    suspend fun updateFeedPost(
        @Path("postId") postId: Long,
        @Body request: UpdateFeedPostRequest,
    ): FeedPostDto

    @DELETE("feed/{postId}")
    suspend fun deleteFeedPost(@Path("postId") postId: Long)

    @POST("feed/{postId}/likes")
    suspend fun likeFeedPost(@Path("postId") postId: Long): FeedLikeResponseDto

    @DELETE("feed/{postId}/likes")
    suspend fun unlikeFeedPost(@Path("postId") postId: Long): FeedLikeResponseDto

    @GET("feed/{postId}/comments")
    suspend fun getFeedComments(@Path("postId") postId: Long): FeedCommentsDto

    @POST("feed/{postId}/comments")
    suspend fun createFeedComment(
        @Path("postId") postId: Long,
        @Body request: FeedCommentRequest,
    ): FeedCommentsDto

    @GET("groups")
    suspend fun getGroups(): List<GroupChatDto>

    @GET("groups/{groupId}")
    suspend fun getGroup(@Path("groupId") groupId: Long): GroupChatDto

    @GET("groups/{groupId}/messages")
    suspend fun getGroupMessages(@Path("groupId") groupId: Long): List<ChatMessageDto>

    @POST("groups/{groupId}/messages")
    suspend fun sendGroupMessage(
        @Path("groupId") groupId: Long,
        @Body request: SendMessageRequest,
    ): SendMessageResponseDto

    @POST("groups/{groupId}/polls/{messageId}/votes")
    suspend fun voteInPoll(
        @Path("groupId") groupId: Long,
        @Path("messageId") messageId: String,
        @Body request: VoteRequest,
    ): VoteResponseDto

    @GET("profile")
    suspend fun getProfile(): ProfileDto

    @PUT("profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): ProfileDto

    @GET("friends")
    suspend fun getFriends(): List<FriendDto>

    @GET("friends/search")
    suspend fun searchFriends(@Query("query") query: String): List<FriendDto>

    @POST("friends/add/{friendId}")
    suspend fun addFriend(@Path("friendId") friendId: String): FriendDto

    @DELETE("friends/{friendId}")
    suspend fun removeFriend(@Path("friendId") friendId: String)
}
