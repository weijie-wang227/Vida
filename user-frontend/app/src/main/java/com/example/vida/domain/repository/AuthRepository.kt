package com.example.vida.domain.repository

import com.example.vida.domain.model.AuthUser

interface AuthRepository {
    suspend fun restoreSession(): AuthUser?
    suspend fun signIn(email: String, password: String): AuthUser
    suspend fun signOut()
}
