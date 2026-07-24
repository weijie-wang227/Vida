package com.example.vida.data.local

import androidx.room.TypeConverter
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class VidaTypeConverters {
    @TypeConverter
    fun encodeStringList(value: List<String>): String = Json.encodeToString(value)

    @TypeConverter
    fun decodeStringList(value: String): List<String> =
        runCatching { Json.decodeFromString<List<String>>(value) }
            .getOrDefault(emptyList())
}
