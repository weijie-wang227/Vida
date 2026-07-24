package com.example.vida.domain.repository

import com.example.vida.domain.model.ChatMessage
import com.example.vida.domain.model.GroupChat

interface GroupsRepository {
    suspend fun getGroups(): List<GroupChat>
    suspend fun getGroup(groupId: Long): GroupChat
    suspend fun getMessages(groupId: Long): List<ChatMessage>
    suspend fun sendMessage(groupId: Long, text: String): ChatMessage
    suspend fun vote(groupId: Long, messageId: String, optionId: String): ChatMessage
}
