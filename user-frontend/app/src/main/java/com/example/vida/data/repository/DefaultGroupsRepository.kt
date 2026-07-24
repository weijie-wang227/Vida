package com.example.vida.data.repository

import com.example.vida.data.remote.VidaApi
import com.example.vida.data.remote.model.SendMessageRequest
import com.example.vida.data.remote.model.VoteRequest
import com.example.vida.data.remote.model.asDomainModel
import com.example.vida.domain.repository.GroupsRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DefaultGroupsRepository @Inject constructor(
    private val api: VidaApi,
) : GroupsRepository {
    override suspend fun getGroups() = api.getGroups().map { it.asDomainModel() }
    override suspend fun getGroup(groupId: Long) = api.getGroup(groupId).asDomainModel()
    override suspend fun getMessages(groupId: Long) = api.getGroupMessages(groupId).map { it.asDomainModel() }
    override suspend fun sendMessage(groupId: Long, text: String) =
        api.sendGroupMessage(groupId, SendMessageRequest(text)).message.asDomainModel()
    override suspend fun vote(groupId: Long, messageId: String, optionId: String) =
        api.voteInPoll(groupId, messageId, VoteRequest(optionId)).message.asDomainModel()
}
