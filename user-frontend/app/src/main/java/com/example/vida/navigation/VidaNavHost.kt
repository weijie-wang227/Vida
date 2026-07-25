package com.example.vida.navigation

import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import com.example.vida.domain.model.AuthUser
import com.example.vida.feature.activities.ActivityCollection
import com.example.vida.feature.activities.ActivityCollectionScreen
import com.example.vida.feature.activities.ActivityDetailScreen
import com.example.vida.feature.activities.ActivitiesScreen
import com.example.vida.feature.activities.FavoritedActivitiesScreen
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
    val context = LocalContext.current

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
                onFavoritedActivitiesClick = {
                    navController.navigate(FavoritedActivitiesDestination)
                },
                onCalendarClick = {
                    navController.navigate(ActivityCalendarDestination)
                },
                onCollectionClick = { collection ->
                    navController.navigate(
                        ActivityCollectionDestination(collection.routeValue),
                    )
                },
            )
        }
        composable<ActivityCollectionDestination> { backStackEntry ->
            val destination = backStackEntry.toRoute<ActivityCollectionDestination>()
            val collection = ActivityCollection.fromRoute(destination.collection)

            if (collection == null) {
                FeaturePlaceholderScreen("Unknown activity collection")
            } else {
                ActivityCollectionScreen(
                    collection = collection,
                    onBack = navController::navigateUp,
                    onActivityClick = { activityId ->
                        navController.navigate(ActivityDetailDestination(activityId))
                    },
                )
            }
        }
        composable<FavoritedActivitiesDestination> {
            FavoritedActivitiesScreen(
                onBack = navController::navigateUp,
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
            ActivityDetailScreen(
                activityId = destination.activityId,
                currentUserHandle = currentUser.handle,
                onBack = navController::navigateUp,
                onShare = { activity ->
                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(
                            Intent.EXTRA_TEXT,
                            buildString {
                                append(activity.title)
                                append("\nHosted by ")
                                append(activity.vendor?.name ?: activity.host)
                            },
                        )
                    }
                    context.startActivity(
                        Intent.createChooser(shareIntent, "Share activity"),
                    )
                },
                onOpenGroup = { groupId ->
                    navController.navigate(GroupDetailDestination(groupId))
                },
            )
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
