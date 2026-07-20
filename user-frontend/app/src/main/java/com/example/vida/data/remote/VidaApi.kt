package com.example.vida.data.remote

import com.example.vida.data.remote.model.ActivityDto
import retrofit2.http.GET

interface VidaApi {
    @GET("activities")
    suspend fun getActivities(): List<ActivityDto>
}
