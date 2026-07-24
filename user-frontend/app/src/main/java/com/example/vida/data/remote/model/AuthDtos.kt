package com.example.vida.data.remote.model

import com.example.vida.domain.model.AuthUser
import kotlinx.serialization.Serializable

@Serializable
data class SignInRequestDto(
    val email: String,
    val password: String,
)

@Serializable
data class AuthResponseDto(
    val token: String,
    val user: AuthUserDto,
)

@Serializable
data class CurrentUserResponseDto(
    val user: AuthUserDto,
)

@Serializable
data class AuthUserDto(
    val id: String,
    val email: String,
    val name: String,
    val handle: String,
    val avatar: String? = null,
    val bio: String = "",
)

@Serializable
data class ApiErrorDto(
    val message: String? = null,
)

fun AuthUserDto.asDomainModel() = AuthUser(
    id = id,
    email = email,
    name = name,
    handle = handle,
    avatar = avatar,
    bio = bio,
)
