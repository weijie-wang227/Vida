package com.example.vida.domain.repository

import com.example.vida.domain.model.Friend
import com.example.vida.domain.model.UserProfile

interface ProfileRepository {
    suspend fun getProfile(): UserProfile
    suspend fun updateProfile(name: String, handle: String, bio: String, avatar: String?): UserProfile
    suspend fun getFriends(): List<Friend>
    suspend fun searchFriends(query: String): List<Friend>
    suspend fun addFriend(friendId: String): Friend
    suspend fun removeFriend(friendId: String)
}
