package com.example.vida.feature.activities

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun FavoritedActivitiesScreen(
    onBack: () -> Unit,
    onActivityClick: (Long) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: FavoritedActivitiesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    BaseActivityList(
        title = "Favorited Activities",
        activities = uiState.activities,
        favoriteActivityIds = uiState.activities.mapTo(linkedSetOf()) { it.id },
        favoriteMutationIds = uiState.favoriteMutationIds,
        isLoading = uiState.isLoading,
        errorMessage = uiState.errorMessage,
        emptyMessage = "No favorited activities yet.",
        onActivityClick = onActivityClick,
        onFavoriteClick = viewModel::removeFavorite,
        onRetry = viewModel::refresh,
        onBackClick = onBack,
        modifier = modifier,
    )
}
