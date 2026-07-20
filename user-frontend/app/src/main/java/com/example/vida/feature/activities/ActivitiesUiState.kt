package com.example.vida.feature.activities

import com.example.vida.domain.model.ActivitySummary

data class ActivitiesUiState(
    val activities: List<ActivitySummary> = emptyList(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
)
