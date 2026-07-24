package com.example.vida.domain.model

data class AuthUser(
    val id: String,
    val email: String,
    val name: String,
    val handle: String,
    val avatar: String?,
    val bio: String,
)
