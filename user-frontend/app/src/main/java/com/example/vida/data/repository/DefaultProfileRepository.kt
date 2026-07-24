package com.example.vida.data.repository

import com.example.vida.data.remote.VidaApi
import com.example.vida.data.remote.model.UpdateProfileRequest
import com.example.vida.data.remote.model.asDomainModel
import com.example.vida.domain.repository.ProfileRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DefaultProfileRepository @Inject constructor(
    private val api: VidaApi,
) : ProfileRepository {
    override suspend fun getProfile() = api.getProfile().asDomainModel()
    override suspend fun updateProfile(name: String, handle: String, bio: String, avatar: String?) =
        api.updateProfile(UpdateProfileRequest(name, handle, bio, avatar)).asDomainModel()
    override suspend fun getFriends() = api.getFriends().map { it.asDomainModel() }
    override suspend fun searchFriends(query: String) = api.searchFriends(query).map { it.asDomainModel() }
    override suspend fun addFriend(friendId: String) = api.addFriend(friendId).asDomainModel()
    override suspend fun removeFriend(friendId: String) = api.removeFriend(friendId)
}
