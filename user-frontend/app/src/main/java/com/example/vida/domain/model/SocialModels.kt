package com.example.vida.domain.model

data class FeedPost(
    val id: Long,
    val user: String,
    val handle: String,
    val avatar: String?,
    val createdAt: String,
    val caption: String,
    val image: String?,
    val likesCount: Int,
    val likedByMe: Boolean,
    val comments: Int,
    val activity: String?,
    val durationMinutes: Int?,
    val categories: List<String>,
    val group: FeedGroupReference?,
)

data class FeedGroupReference(
    val id: Long,
    val name: String,
    val avatar: String?,
    val members: Int,
)

data class FeedComment(
    val id: String,
    val postId: Long,
    val user: String,
    val handle: String,
    val avatar: String?,
    val body: String,
    val createdAt: String,
)

data class FeedComments(
    val comments: List<FeedComment>,
    val commentCount: Int,
)

data class GroupChat(
    val id: Long,
    val name: String,
    val members: Int,
    val memberList: List<GroupMember>,
    val avatar: String?,
    val lastMessage: String,
    val time: String,
    val unread: Int,
    val isAdmin: Boolean,
)

data class GroupMember(
    val id: String,
    val name: String,
    val handle: String,
    val avatar: String?,
    val isAdmin: Boolean,
)

data class MessageSender(
    val id: String,
    val name: String,
    val handle: String,
    val avatar: String?,
    val isAdmin: Boolean,
)

sealed interface ChatMessage {
    val id: String
    val groupId: Long
    val sender: MessageSender
    val time: String

    data class Text(
        override val id: String,
        override val groupId: Long,
        override val sender: MessageSender,
        override val time: String,
        val text: String,
    ) : ChatMessage

    data class Poll(
        override val id: String,
        override val groupId: Long,
        override val sender: MessageSender,
        override val time: String,
        val question: String,
        val options: List<PollOption>,
        val selectedOptionId: String?,
        val totalVotes: Int,
    ) : ChatMessage

    data class ActivityInvite(
        override val id: String,
        override val groupId: Long,
        override val sender: MessageSender,
        override val time: String,
        val title: String,
        val startsAt: String,
        val location: String,
        val durationMinutes: Int,
        val credits: Int,
        val categories: List<String>,
    ) : ChatMessage
}

data class PollOption(
    val id: String,
    val text: String,
    val votes: Int,
)

data class UserProfile(
    val name: String,
    val handle: String,
    val avatar: String?,
    val bio: String,
    val stats: List<ProfileStat>,
    val account: ProfileAccount?,
)

data class ProfileStat(val label: String, val value: String)

data class ProfileAccount(val membershipName: String, val creditsLeft: Int)

data class Friend(
    val id: String,
    val name: String,
    val handle: String,
    val avatar: String?,
)
