package com.example.vida.feature.activities

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun ActivityCollectionScreen(
    collection: ActivityCollection,
    onBack: () -> Unit,
    onActivityClick: (Long) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ActivityCollectionViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(collection) {
        viewModel.load(collection)
    }

    BaseActivityList(
        title = collection.title,
        activities = uiState.activities,
        favoriteActivityIds = uiState.favoriteActivityIds,
        favoriteMutationIds = uiState.favoriteMutationIds,
        isLoading = uiState.isLoading,
        errorMessage = uiState.errorMessage,
        emptyMessage = collection.emptyMessage,
        onActivityClick = onActivityClick,
        onFavoriteClick = viewModel::toggleFavorite,
        onRetry = viewModel::refresh,
        onBackClick = onBack,
        modifier = modifier,
    )
}
