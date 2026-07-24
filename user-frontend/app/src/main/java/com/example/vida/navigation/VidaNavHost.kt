package com.example.vida.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import com.example.vida.domain.model.AuthUser
import com.example.vida.feature.activities.ActivitiesScreen
import com.example.vida.feature.common.FeaturePlaceholderScreen
import com.example.vida.feature.feed.FeedScreen
import com.example.vida.feature.groups.GroupDetailScreen
import com.example.vida.feature.groups.GroupsScreen
import com.example.vida.feature.profile.ProfileScreen

@Composable
fun VidaNavHost(
    navController: NavHostController,
    currentUser: AuthUser,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier,
) {
    NavHost(
        navController = navController,
        startDestination = ActivitiesDestination,
        modifier = modifier,
    ) {
        composable<ActivitiesDestination> {
            ActivitiesScreen(
                onActivityClick = { activityId ->
                    navController.navigate(ActivityDetailDestination(activityId))
                },
            )
        }
        composable<ActivityCalendarDestination> {
            FeaturePlaceholderScreen("Activity calendar")
        }
        composable<ActivityDetailDestination> { backStackEntry ->
            val destination = backStackEntry.toRoute<ActivityDetailDestination>()
            FeaturePlaceholderScreen("Activity ${destination.activityId}")
        }
        composable<ActivityReviewDestination> { backStackEntry ->
            val destination = backStackEntry.toRoute<ActivityReviewDestination>()
            FeaturePlaceholderScreen("Review activity ${destination.activityId}")
        }
        composable<FeedDestination> {
            FeedScreen(
                currentUser = currentUser,
                onOpenGroup = { groupId -> navController.navigate(GroupDetailDestination(groupId)) },
            )
        }
        composable<GroupsDestination> {
            GroupsScreen(
                onOpenGroup = { groupId -> navController.navigate(GroupDetailDestination(groupId)) },
            )
        }
        composable<GroupDetailDestination> { backStackEntry ->
            val destination = backStackEntry.toRoute<GroupDetailDestination>()
            GroupDetailScreen(
                groupId = destination.groupId,
                currentUser = currentUser,
                onBack = navController::navigateUp,
            )
        }
        composable<ProfileDestination> {
            ProfileScreen(
                user = currentUser,
                onSignOut = onSignOut,
            )
        }
        composable<SettingsDestination> {
            FeaturePlaceholderScreen("Settings")
        }
    }
}
