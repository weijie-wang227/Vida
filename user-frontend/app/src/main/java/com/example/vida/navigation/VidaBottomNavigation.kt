package com.example.vida.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Landscape
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PhotoCamera
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.foundation.layout.RowScope
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavController
import androidx.navigation.NavDestination
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import com.example.vida.core.designsystem.component.VidaProgressMark

enum class TopLevelDestination(
    val label: String,
    val icon: ImageVector,
) {
    Activities("Activities", Icons.Rounded.Landscape),
    Feed("Feed", Icons.Rounded.PhotoCamera),
    Groups("Groups", Icons.Rounded.Groups),
    Profile("Profile", Icons.Rounded.Person),
}

@Composable
fun VidaBottomNavigation(
    navController: NavController,
    currentDestination: NavDestination?,
    onProgressClick: () -> Unit,
) {
    val destinations = TopLevelDestination.entries

    NavigationBar {
        destinations.take(2).forEach { destination ->
            VidaNavigationItem(destination, currentDestination, navController)
        }

        NavigationBarItem(
            selected = false,
            onClick = onProgressClick,
            icon = { VidaProgressMark() },
            label = { Text("Vida") },
        )

        destinations.drop(2).forEach { destination ->
            VidaNavigationItem(destination, currentDestination, navController)
        }
    }
}

@Composable
private fun RowScope.VidaNavigationItem(
    destination: TopLevelDestination,
    currentDestination: NavDestination?,
    navController: NavController,
) {
    NavigationBarItem(
        selected = currentDestination.isSelected(destination),
        onClick = { navController.navigateToTopLevel(destination) },
        icon = {
            Icon(
                imageVector = destination.icon,
                contentDescription = destination.label,
            )
        },
        label = { Text(destination.label) },
    )
}

private fun NavController.navigateToTopLevel(destination: TopLevelDestination) {
    when (destination) {
        TopLevelDestination.Activities -> navigateToTopLevelRoute(ActivitiesDestination)
        TopLevelDestination.Feed -> navigateToTopLevelRoute(FeedDestination)
        TopLevelDestination.Groups -> navigateToTopLevelRoute(GroupsDestination)
        TopLevelDestination.Profile -> navigateToTopLevelRoute(ProfileDestination)
    }
}

private fun <T : Any> NavController.navigateToTopLevelRoute(route: T) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) {
            saveState = true
        }
        launchSingleTop = true
        restoreState = true
    }
}

private fun NavDestination?.isSelected(destination: TopLevelDestination): Boolean {
    return this?.hierarchy?.any { entry ->
        when (destination) {
            TopLevelDestination.Activities ->
                entry.hasRoute<ActivitiesDestination>() ||
                    entry.hasRoute<ActivityCalendarDestination>() ||
                    entry.hasRoute<ActivityDetailDestination>() ||
                    entry.hasRoute<ActivityReviewDestination>()

            TopLevelDestination.Feed -> entry.hasRoute<FeedDestination>()
            TopLevelDestination.Groups ->
                entry.hasRoute<GroupsDestination>() || entry.hasRoute<GroupDetailDestination>()

            TopLevelDestination.Profile ->
                entry.hasRoute<ProfileDestination>() || entry.hasRoute<SettingsDestination>()
        }
    } == true
}
