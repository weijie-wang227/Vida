package com.example.vida.data.remote.model

import kotlinx.serialization.Serializable

@Serializable
data class AvailableTagDto(
    val id: String,
    val name: String,
    val imageUrl: String = "",
)
