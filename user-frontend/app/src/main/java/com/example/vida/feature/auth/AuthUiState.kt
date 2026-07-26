package com.example.vida.feature.auth

import com.example.vida.domain.model.AuthUser

data class AuthUiState(
    val isCheckingSession: Boolean = true,
    val currentUser: AuthUser? = null,
    val mode: AuthMode = AuthMode.SignIn,
    val name: String = "",
    val handle: String = "",
    val email: String = "",
    val password: String = "",
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
)

enum class AuthMode {
    SignIn,
    SignUp,
}
