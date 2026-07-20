package com.example.vida

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.vida.core.designsystem.component.VidaProgressMark
import com.example.vida.core.designsystem.theme.VidaTheme
import com.example.vida.navigation.VidaBottomNavigation
import com.example.vida.navigation.VidaNavHost

@Composable
fun VidaApp() {
    VidaTheme {
        val navController = rememberNavController()
        val backStackEntry by navController.currentBackStackEntryAsState()
        var showProgress by remember { mutableStateOf(false) }

        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = {
                VidaBottomNavigation(
                    navController = navController,
                    currentDestination = backStackEntry?.destination,
                    onProgressClick = { showProgress = true },
                )
            },
        ) { innerPadding ->
            VidaNavHost(
                navController = navController,
                modifier = Modifier.padding(innerPadding),
            )
        }

        if (showProgress) {
            AlertDialog(
                onDismissRequest = { showProgress = false },
                icon = { VidaProgressMark(size = 64.dp) },
                title = { Text("Vida progress") },
                text = {
                    Text("Physical, social, cognitive, and creative progress will be connected during the feature port.")
                },
                confirmButton = {
                    Button(onClick = { showProgress = false }) {
                        Text("Close")
                    }
                },
            )
        }
    }
}
