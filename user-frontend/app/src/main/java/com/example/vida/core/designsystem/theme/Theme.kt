package com.example.vida.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = VidaGold,
    onPrimary = VidaInk,
    primaryContainer = VidaSurface,
    onPrimaryContainer = VidaCream,
    secondary = VidaGreen,
    tertiary = VidaBlue,
    background = VidaInk,
    onBackground = VidaCream,
    surface = VidaCard,
    onSurface = VidaCream,
    surfaceVariant = VidaSurface,
    onSurfaceVariant = VidaMuted,
    error = VidaDanger,
)

private val LightColorScheme = lightColorScheme(
    primary = VidaLightAccent,
    onPrimary = VidaInk,
    secondary = ColorTokens.lightSecondary,
    tertiary = VidaPink,
    background = VidaLightBackground,
    onBackground = VidaLightForeground,
    surface = VidaLightSurface,
    onSurface = VidaLightForeground,
    surfaceVariant = ColorTokens.lightSurfaceVariant,
    onSurfaceVariant = VidaLightMuted,
    error = VidaDanger,
)

private object ColorTokens {
    val lightSecondary = androidx.compose.ui.graphics.Color(0xFF22A8BD)
    val lightSurfaceVariant = androidx.compose.ui.graphics.Color(0xFFE6F1F3)
}

@Composable
fun VidaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme,
        typography = VidaTypography,
        content = content,
    )
}
