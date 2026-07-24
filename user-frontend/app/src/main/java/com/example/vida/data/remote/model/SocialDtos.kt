package com.example.vida.data.remote.model

import com.example.vida.domain.model.ChatMessage
import com.example.vida.domain.model.FeedComment
import com.example.vida.domain.model.FeedComments
import com.example.vida.domain.model.FeedGroupReference
import com.example.vida.domain.model.FeedPost
import com.example.vida.domain.model.Friend
import com.example.vida.domain.model.GroupChat
import com.example.vida.domain.model.GroupMember
import com.example.vida.domain.model.MessageSender
import com.example.vida.domain.model.PollOption
import com.example.vida.domain.model.ProfileAccount
import com.example.vida.domain.model.ProfileStat
import com.example.vida.domain.model.UserProfile
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

@Serializable
data class FeedPostDto(
    val id: Long,
    val user: String,
    val handle: String,
    val avatar: String? = null,
    val createdAt: String,
    val caption: String,
    val image: String? = null,
    val likesCount: Int = 0,
    val likedByMe: Boolean = false,
    val comments: Int = 0,
    val activity: String? = null,
    val durationMinutes: Int? = null,
    val categories: List<String> = emptyList(),
    val group: FeedGroupReferenceDto? = null,
)

@Serializable
data class FeedGroupReferenceDto(
    val id: Long,
    val name: String,
    val avatar: String? = null,
    val members: Int = 0,
)

@Serializable
data class FeedCommentDto(
    val id: String,
    val postId: Long,
    val user: String,
    val handle: String,
    val avatar: String? = null,
    val body: String,
    val createdAt: String,
)

@Serializable
data class FeedCommentsDto(
    val comments: List<FeedCommentDto> = emptyList(),
    val commentCount: Int = 0,
)

@Serializable
data class CreateFeedPostRequest(
    val caption: String,
    val categories: List<String>,
    val durationMinutes: Int,
    val image: String? = null,
    val groupId: Long? = null,
)

@Serializable
data class UpdateFeedPostRequest(val caption: String)

@Serializable
data class FeedCommentRequest(val body: String)

@Serializable
data class FeedLikeResponseDto(
    val postId: Long,
    val likesCount: Int,
    val likedByMe: Boolean,
)

@Serializable
data class GroupChatDto(
    val id: Long,
    val name: String,
    val members: Int = 0,
    val memberList: List<GroupMemberDto> = emptyList(),
    val avatar: String? = null,
    val lastMessage: String = "",
    val time: String = "",
    val unread: Int = 0,
    val isAdmin: Boolean = false,
)

@Serializable
data class GroupMemberDto(
    val id: String,
    val name: String,
    val handle: String,
    val avatar: String? = null,
    val isAdmin: Boolean = false,
)

@Serializable
data class ChatMessageDto(
    val id: String,
    val groupId: Long,
    val sender: GroupMemberDto,
    val time: String,
    val type: String,
    val payload: JsonElement,
)

@Serializable
data class SendMessageRequest(val text: String)

@Serializable
data class VoteRequest(val optionId: String)

@Serializable
data class SendMessageResponseDto(val message: ChatMessageDto, val group: GroupChatDto)

@Serializable
data class VoteResponseDto(val message: ChatMessageDto)

@Serializable
data class ProfileDto(
    val name: String,
    val handle: String,
    val avatar: String? = null,
    val bio: String = "",
    val stats: List<ProfileStatDto> = emptyList(),
    val account: ProfileAccountDto? = null,
)

@Serializable
data class ProfileStatDto(val label: String, val value: String)

@Serializable
data class ProfileAccountDto(val membershipName: String, val creditsLeft: Int)

@Serializable
data class FriendDto(
    val id: JsonElement,
    val name: String,
    val handle: String,
    val avatar: String? = null,
)

@Serializable
data class UpdateProfileRequest(
    val name: String,
    val handle: String,
    val bio: String,
    val avatar: String? = null,
)

private fun FeedGroupReferenceDto.asDomainModel() = FeedGroupReference(id, name, avatar, members)

fun FeedPostDto.asDomainModel() = FeedPost(
    id, user, handle, avatar, createdAt, caption, image, likesCount, likedByMe,
    comments, activity, durationMinutes, categories, group?.asDomainModel(),
)

private fun FeedCommentDto.asDomainModel() = FeedComment(
    id, postId, user, handle, avatar, body, createdAt,
)

fun FeedCommentsDto.asDomainModel() = FeedComments(comments.map { it.asDomainModel() }, commentCount)

fun GroupMemberDto.asDomainModel() = GroupMember(id, name, handle, avatar, isAdmin)

fun GroupChatDto.asDomainModel() = GroupChat(
    id, name, members, memberList.map { it.asDomainModel() }, avatar, lastMessage, time, unread, isAdmin,
)

fun ChatMessageDto.asDomainModel(): ChatMessage {
    val senderModel = MessageSender(sender.id, sender.name, sender.handle, sender.avatar, sender.isAdmin)
    val body = payload.jsonObject
    return when (type) {
        "poll" -> {
            val options = body["options"]?.jsonArray?.map { optionValue ->
                val option = optionValue.jsonObject
                PollOption(
                    id = option["id"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                    text = option["text"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                    votes = option["votes"]?.jsonPrimitive?.intOrNull ?: 0,
                )
            }.orEmpty()
            ChatMessage.Poll(
                id, groupId, senderModel, time,
                question = body["question"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                options = options,
                selectedOptionId = body["selectedOptionId"]?.jsonPrimitive?.contentOrNull,
                totalVotes = body["totalVotes"]?.jsonPrimitive?.intOrNull ?: options.sumOf { it.votes },
            )
        }
        "activity_invite" -> {
            val activity = body["activity"]?.jsonObject.orEmpty()
            ChatMessage.ActivityInvite(
                id, groupId, senderModel, time,
                title = activity["title"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                startsAt = activity["startsAt"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                location = activity["location"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                durationMinutes = activity["durationMinutes"]?.jsonPrimitive?.intOrNull ?: 0,
                credits = activity["credits"]?.jsonPrimitive?.intOrNull ?: 0,
                categories = activity["categories"]?.jsonArray?.mapNotNull { it.jsonPrimitive.contentOrNull }.orEmpty(),
            )
        }
        else -> ChatMessage.Text(
            id, groupId, senderModel, time,
            text = body["text"]?.jsonPrimitive?.contentOrNull.orEmpty(),
        )
    }
}

fun ProfileDto.asDomainModel() = UserProfile(
    name = name,
    handle = handle,
    avatar = avatar,
    bio = bio,
    stats = stats.map { ProfileStat(it.label, it.value) },
    account = account?.let { ProfileAccount(it.membershipName, it.creditsLeft) },
)

fun FriendDto.asDomainModel() = Friend(id.jsonPrimitive.content, name, handle, avatar)
