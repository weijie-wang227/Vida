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
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.vida.core.designsystem.component.VidaProgressMark
import com.example.vida.core.designsystem.theme.VidaTheme
import com.example.vida.domain.model.AuthUser
import com.example.vida.feature.auth.AuthLoadingScreen
import com.example.vida.feature.auth.AuthMode
import com.example.vida.feature.auth.AuthViewModel
import com.example.vida.feature.auth.LoginScreen
import com.example.vida.navigation.VidaBottomNavigation
import com.example.vida.navigation.GroupDetailDestination
import com.example.vida.navigation.VidaNavHost

@Composable
fun VidaApp(
    authViewModel: AuthViewModel = hiltViewModel(),
) {
    VidaTheme {
        val authState by authViewModel.uiState.collectAsStateWithLifecycle()

        when {
            authState.isCheckingSession -> AuthLoadingScreen()
            authState.currentUser == null -> LoginScreen(
                uiState = authState,
                onModeChange = authViewModel::updateMode,
                onNameChange = authViewModel::updateName,
                onHandleChange = authViewModel::updateHandle,
                onEmailChange = authViewModel::updateEmail,
                onPasswordChange = authViewModel::updatePassword,
                onSubmit = {
                    when (authState.mode) {
                        AuthMode.SignIn -> authViewModel.signIn()
                        AuthMode.SignUp -> authViewModel.signUp()
                    }
                },
            )
            else -> AuthenticatedVidaApp(
                currentUser = checkNotNull(authState.currentUser),
                onSignOut = authViewModel::signOut,
            )
        }
    }
}

@Composable
private fun AuthenticatedVidaApp(
    currentUser: AuthUser,
    onSignOut: () -> Unit,
) {
        val navController = rememberNavController()
        val backStackEntry by navController.currentBackStackEntryAsState()
        var showProgress by remember { mutableStateOf(false) }
        val showBottomNavigation = backStackEntry?.destination?.hasRoute<GroupDetailDestination>() != true

        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = {
                if (showBottomNavigation) {
                    VidaBottomNavigation(
                        navController = navController,
                        currentDestination = backStackEntry?.destination,
                        onProgressClick = { showProgress = true },
                    )
                }
            },
        ) { innerPadding ->
            VidaNavHost(
                navController = navController,
                currentUser = currentUser,
                onSignOut = onSignOut,
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
