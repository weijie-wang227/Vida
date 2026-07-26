package com.example.vida.feature.activities

import com.example.vida.domain.model.ActivitySummary
import com.example.vida.domain.model.AvailableTag

data class ActivitiesUiState(
    val activities: List<ActivitySummary> = emptyList(),
    val favoriteActivityIds: Set<Long> = emptySet(),
    val favoriteMutationIds: Set<Long> = emptySet(),
    val availableTags: List<AvailableTag> = emptyList(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val tagsErrorMessage: String? = null,
    val favoritesErrorMessage: String? = null,
)
