package com.example.vida.data.repository

import com.example.vida.core.storage.TokenStore
import com.example.vida.data.remote.VidaApi
import com.example.vida.data.remote.model.ApiErrorDto
import com.example.vida.data.remote.model.SignInRequestDto
import com.example.vida.data.remote.model.SignUpRequestDto
import com.example.vida.data.remote.model.asDomainModel
import com.example.vida.domain.model.AuthUser
import com.example.vida.domain.repository.AuthRepository
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import retrofit2.HttpException

@Singleton
class DefaultAuthRepository @Inject constructor(
    private val api: VidaApi,
    private val tokenStore: TokenStore,
    private val json: Json,
) : AuthRepository {
    override suspend fun restoreSession(): AuthUser? {
        if (tokenStore.currentToken().isNullOrBlank()) {
            return null
        }

        return try {
            api.getCurrentUser().user.asDomainModel()
        } catch (error: HttpException) {
            if (error.code() == 401) {
                tokenStore.clearAuthToken()
                null
            } else {
                throw error.asAuthException("Unable to restore your session.")
            }
        } catch (error: IOException) {
            throw AuthException("Unable to reach the server. Check your connection.", error)
        }
    }

    override suspend fun signIn(email: String, password: String): AuthUser {
        return try {
            val response = api.signIn(
                SignInRequestDto(
                    email = email.trim(),
                    password = password,
                ),
            )
            tokenStore.saveAuthToken(response.token)
            response.user.asDomainModel()
        } catch (error: HttpException) {
            throw error.asAuthException("Unable to sign in.")
        } catch (error: IOException) {
            throw AuthException("Unable to reach the server. Check your connection.", error)
        }
    }

    override suspend fun signUp(
        name: String,
        handle: String?,
        email: String,
        password: String,
    ): AuthUser {
        return try {
            val response = api.signUp(
                SignUpRequestDto(
                    name = name.trim(),
                    handle = handle?.trim()?.takeIf(String::isNotBlank),
                    email = email.trim(),
                    password = password,
                ),
            )
            tokenStore.saveAuthToken(response.token)
            response.user.asDomainModel()
        } catch (error: HttpException) {
            throw error.asAuthException("Unable to create your account.")
        } catch (error: IOException) {
            throw AuthException("Unable to reach the server. Check your connection.", error)
        }
    }

    override suspend fun signOut() {
        tokenStore.clearAuthToken()
    }

    private fun HttpException.asAuthException(fallback: String): AuthException {
        val responseMessage = runCatching {
            response()?.errorBody()?.string()?.let { body ->
                json.decodeFromString<ApiErrorDto>(body).message
            }
        }.getOrNull()

        return AuthException(responseMessage?.takeIf(String::isNotBlank) ?: fallback, this)
    }
}

class AuthException(
    message: String,
    cause: Throwable? = null,
) : Exception(message, cause)
