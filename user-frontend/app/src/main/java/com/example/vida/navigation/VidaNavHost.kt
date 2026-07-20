package com.example.vida.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import com.example.vida.feature.activities.ActivitiesScreen
import com.example.vida.feature.common.FeaturePlaceholderScreen

@Composable
fun VidaNavHost(
    navController: NavHostController,
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
            FeaturePlaceholderScreen("Feed")
        }
        composable<GroupsDestination> {
            FeaturePlaceholderScreen("Groups")
        }
        composable<GroupDetailDestination> { backStackEntry ->
            val destination = backStackEntry.toRoute<GroupDetailDestination>()
            FeaturePlaceholderScreen("Group ${destination.groupId}")
        }
        composable<ProfileDestination> {
            FeaturePlaceholderScreen("Profile")
        }
        composable<SettingsDestination> {
            FeaturePlaceholderScreen("Settings")
        }
    }
}
