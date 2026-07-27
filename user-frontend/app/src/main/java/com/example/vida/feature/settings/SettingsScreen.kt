package com.example.vida.feature.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.AccountCircle
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material.icons.rounded.Help
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.vida.core.designsystem.component.VidaAvatar
import com.example.vida.core.designsystem.theme.VidaTheme
import com.example.vida.domain.model.AppearanceMode
import com.example.vida.domain.model.AuthUser
import com.example.vida.domain.model.SettingsPreferences

@Composable
fun SettingsScreen(
    user: AuthUser,
    appearanceMode: AppearanceMode,
    onAppearanceModeChange: (AppearanceMode) -> Unit,
    onBack: () -> Unit,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    SettingsContent(
        user = user,
        appearanceMode = appearanceMode,
        state = state,
        onAppearanceModeChange = onAppearanceModeChange,
        onActivityRemindersChange = viewModel::setActivityReminders,
        onFriendDiscoveryChange = viewModel::setFriendDiscovery,
        onPrivateActivityHistoryChange = viewModel::setPrivateActivityHistory,
        onRetry = viewModel::refresh,
        onBack = onBack,
        onSignOut = onSignOut,
        modifier = modifier,
    )
}

@Composable
private fun SettingsContent(
    user: AuthUser,
    appearanceMode: AppearanceMode,
    state: SettingsUiState,
    onAppearanceModeChange: (AppearanceMode) -> Unit,
    onActivityRemindersChange: (Boolean) -> Unit,
    onFriendDiscoveryChange: (Boolean) -> Unit,
    onPrivateActivityHistoryChange: (Boolean) -> Unit,
    onRetry: () -> Unit,
    onBack: () -> Unit,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 6.dp, end = 16.dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back to profile")
            }
            Text(
                text = "Settings",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }
        HorizontalDivider()

        if (state.isSaving) {
            LinearProgressIndicator(Modifier.fillMaxWidth())
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                ProfileSummary(user)
            }

            state.errorMessage?.let { message ->
                item {
                    SettingsError(
                        message = message,
                        onRetry = onRetry,
                    )
                }
            }

            item {
                SettingsCard {
                    AppearanceRow(
                        mode = appearanceMode,
                        onModeChange = onAppearanceModeChange,
                    )
                }
            }

            item {
                SettingsCard {
                    if (state.isLoading) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(28.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            CircularProgressIndicator(Modifier.size(28.dp))
                        }
                    } else {
                        SettingToggleRow(
                            checked = state.preferences.activityReminders,
                            description = "Activity starts, group updates, and host messages.",
                            icon = Icons.Rounded.Notifications,
                            label = "Activity reminders",
                            enabled = !state.isSaving,
                            onCheckedChange = onActivityRemindersChange,
                        )
                        SettingsDivider()
                        SettingToggleRow(
                            checked = state.preferences.friendDiscovery,
                            description = "Let friends find you with your handle and QR invite.",
                            icon = Icons.Rounded.Person,
                            label = "Friend discovery",
                            enabled = !state.isSaving,
                            onCheckedChange = onFriendDiscoveryChange,
                        )
                        SettingsDivider()
                        SettingToggleRow(
                            checked = state.preferences.privateActivityHistory,
                            description = "Hide past activities from profile visitors.",
                            icon = Icons.Rounded.Lock,
                            label = "Private activity history",
                            enabled = !state.isSaving,
                            onCheckedChange = onPrivateActivityHistoryChange,
                        )
                    }
                }
            }

            item {
                SettingsCard {
                    SettingsLinkRow(
                        description = "Manage profile visibility and friend requests.",
                        icon = Icons.Rounded.Shield,
                        label = "Privacy",
                    )
                    SettingsDivider()
                    SettingsLinkRow(
                        description = "Email, password, and sign-in preferences.",
                        icon = Icons.Rounded.Email,
                        label = "Account",
                    )
                    SettingsDivider()
                    SettingsLinkRow(
                        description = "Get help with activities, groups, and invites.",
                        icon = Icons.Rounded.Help,
                        label = "Support",
                    )
                }
            }

            item {
                OutlinedButton(
                    onClick = onSignOut,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Icon(Icons.AutoMirrored.Rounded.Logout, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Sign out")
                }
            }
        }
    }
}

@Composable
private fun ProfileSummary(user: AuthUser) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            VidaAvatar(
                imageUrl = user.avatar,
                name = user.name,
                modifier = Modifier.size(52.dp),
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = user.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = user.handle,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = user.email,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun AppearanceRow(
    mode: AppearanceMode,
    onModeChange: (AppearanceMode) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SettingIcon(
            icon = if (mode == AppearanceMode.Light) {
                Icons.Rounded.LightMode
            } else {
                Icons.Rounded.DarkMode
            },
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = "Appearance",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "Choose the app theme for this device.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.width(8.dp))
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(20.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(3.dp),
        ) {
            AppearanceOption(
                selected = mode == AppearanceMode.Light,
                icon = Icons.Rounded.LightMode,
                label = "Light",
                onClick = { onModeChange(AppearanceMode.Light) },
            )
            AppearanceOption(
                selected = mode == AppearanceMode.Dark,
                icon = Icons.Rounded.DarkMode,
                label = "Dark",
                onClick = { onModeChange(AppearanceMode.Dark) },
            )
        }
    }
}

@Composable
private fun AppearanceOption(
    selected: Boolean,
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Surface(
        modifier = Modifier
            .clip(RoundedCornerShape(17.dp))
            .clickable(onClick = onClick),
        color = if (selected) {
            MaterialTheme.colorScheme.surface
        } else {
            androidx.compose.ui.graphics.Color.Transparent
        },
        shape = RoundedCornerShape(17.dp),
        tonalElevation = if (selected) 2.dp else 0.dp,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 9.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, null, Modifier.size(14.dp))
            Spacer(Modifier.width(4.dp))
            Text(label, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun SettingToggleRow(
    checked: Boolean,
    description: String,
    icon: ImageVector,
    label: String,
    enabled: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SettingIcon(icon)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = description,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.width(8.dp))
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            enabled = enabled,
        )
    }
}

@Composable
private fun SettingsLinkRow(
    description: String,
    icon: ImageVector,
    label: String,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SettingIcon(icon)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = description,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Icon(
            imageVector = Icons.AutoMirrored.Rounded.ArrowForward,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SettingIcon(icon: ImageVector) {
    Box(
        modifier = Modifier
            .size(38.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(18.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SettingsCard(content: @Composable () -> Unit) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column {
            content()
        }
    }
}

@Composable
private fun SettingsDivider() {
    HorizontalDivider(Modifier.padding(start = 62.dp))
}

@Composable
private fun SettingsError(
    message: String,
    onRetry: () -> Unit,
) {
    Surface(
        color = MaterialTheme.colorScheme.errorContainer,
        contentColor = MaterialTheme.colorScheme.onErrorContainer,
        shape = RoundedCornerShape(14.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onRetry) {
                Text("Retry")
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun SettingsScreenPreview() {
    VidaTheme(darkTheme = false) {
        SettingsContent(
            user = AuthUser(
                id = "preview-user",
                email = "maya@example.com",
                name = "Maya Chen",
                handle = "@mayamoves",
                avatar = null,
                bio = "Trying something new every week.",
            ),
            appearanceMode = AppearanceMode.Light,
            state = SettingsUiState(
                preferences = SettingsPreferences(
                    activityReminders = true,
                    friendDiscovery = true,
                    privateActivityHistory = false,
                ),
                isLoading = false,
            ),
            onAppearanceModeChange = {},
            onActivityRemindersChange = {},
            onFriendDiscoveryChange = {},
            onPrivateActivityHistoryChange = {},
            onRetry = {},
            onBack = {},
            onSignOut = {},
        )
    }
}
