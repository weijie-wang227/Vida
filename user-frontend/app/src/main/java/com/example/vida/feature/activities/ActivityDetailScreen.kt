package com.example.vida.feature.activities

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.DirectionsRun
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Psychology
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.example.vida.core.designsystem.component.VidaAvatar
import com.example.vida.core.designsystem.theme.VidaTheme
import com.example.vida.domain.model.ActivityDetails
import com.example.vida.domain.model.ActivityFriend
import com.example.vida.domain.model.ActivitySession
import com.example.vida.domain.model.ActivityVendor
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun ActivityDetailScreen(
    activityId: Long,
    currentUserHandle: String,
    onBack: () -> Unit,
    onShare: (ActivityDetails) -> Unit,
    onOpenGroup: (Long) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ActivityDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(activityId) {
        viewModel.open(activityId)
    }
    LaunchedEffect(state.joinedGroupId) {
        state.joinedGroupId?.let { groupId ->
            viewModel.consumeJoinedGroup()
            onOpenGroup(groupId)
        }
    }

    ActivityDetailContent(
        state = state,
        currentUserHandle = currentUserHandle,
        onBack = onBack,
        onRetry = viewModel::retry,
        onShare = onShare,
        onToggleFavorite = viewModel::toggleFavorite,
        onJoinSession = { session ->
            val joined = session.participatingFriends.any {
                it.handle.equals(currentUserHandle, ignoreCase = true)
            }

            when {
                joined && session.groupId != null -> onOpenGroup(session.groupId)
                joined -> viewModel.showActionError(
                    "This session is already joined, but its group is unavailable.",
                )
                else -> viewModel.joinSession(session.id)
            }
        },
        modifier = modifier,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ActivityDetailContent(
    state: ActivityDetailUiState,
    currentUserHandle: String,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onShare: (ActivityDetails) -> Unit,
    onToggleFavorite: () -> Unit,
    onJoinSession: (ActivitySession) -> Unit,
    modifier: Modifier = Modifier,
) {
    val activity = state.activity
    var showVendor by remember(activity?.vendor?.id) { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        ActivityDetailHeader(
            canShare = activity != null,
            onBack = onBack,
            onShare = { activity?.let(onShare) },
        )

        when {
            activity == null -> ActivityDetailEmptyState(
                isLoading = state.isLoading,
                message = state.errorMessage,
                onRetry = onRetry,
            )

            else -> Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
            ) {
                ActivityHero(activity)
                Column(
                    modifier = Modifier.padding(horizontal = 16.dp),
                ) {
                    ActivityTitleBlock(
                        activity = activity,
                        isFavorited = state.isFavorited,
                        isFavoriteMutationInProgress = state.isFavoriteMutationInProgress,
                        onVendorClick = { showVendor = true },
                        onToggleFavorite = onToggleFavorite,
                    )
                    ActivityPaymentSummary(activity)
                    FriendsCard(
                        friends = activity.participatingFriends,
                        description = activity.description.ifBlank {
                            "A small-group activity for meeting nearby friends and enjoying " +
                                "Singapore at an easy pace."
                        },
                    )
                    AvailableSessions(
                        activity = activity,
                        currentUserHandle = currentUserHandle,
                        joiningSessionId = state.joiningSessionId,
                        actionErrorMessage = state.actionErrorMessage,
                        onJoinSession = onJoinSession,
                    )
                }
            }
        }
    }

    if (showVendor) {
        activity?.vendor?.let { vendor ->
            VendorSheet(
                vendor = vendor,
                onDismiss = { showVendor = false },
            )
        }
    }
}

@Composable
private fun ActivityDetailHeader(
    canShare: Boolean,
    onBack: () -> Unit,
    onShare: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        FilledIconButton(
            onClick = onBack,
            modifier = Modifier.size(36.dp),
        ) {
            Icon(Icons.Rounded.ArrowBack, contentDescription = "Back to activities")
        }
        Text(
            text = "Activity",
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 12.dp),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        IconButton(
            onClick = onShare,
            enabled = canShare,
            modifier = Modifier.size(36.dp),
        ) {
            Icon(Icons.Rounded.Share, contentDescription = "Share activity")
        }
    }
}

@Composable
private fun ActivityDetailEmptyState(
    isLoading: Boolean,
    message: String?,
    onRetry: () -> Unit,
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier.padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            if (isLoading) {
                CircularProgressIndicator()
                Text(
                    text = "Loading activity...",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Text(
                    text = message ?: "Activity not found.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedButton(onClick = onRetry) {
                    Text("Try again")
                }
            }
        }
    }
}

@Composable
private fun ActivityHero(activity: ActivityDetails) {
    val primaryCategory = activity.categories.firstOrNull() ?: "social"

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(if (activity.coverUrl.isNullOrBlank()) 152.dp else 220.dp)
            .padding(horizontal = 16.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.Center,
    ) {
        if (activity.coverUrl.isNullOrBlank()) {
            Surface(
                modifier = Modifier.size(76.dp),
                shape = RoundedCornerShape(22.dp),
                color = categoryColor(primaryCategory).copy(alpha = 0.18f),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = categoryIcon(primaryCategory),
                        contentDescription = null,
                        tint = categoryColor(primaryCategory),
                        modifier = Modifier.size(38.dp),
                    )
                }
            }
        } else {
            AsyncImage(
                model = activity.coverUrl,
                contentDescription = activity.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.62f)),
                            startY = 80f,
                        ),
                    ),
            )
        }

        if (activity.isPremium || activity.skillsFuturePayable) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                if (activity.isPremium) {
                    ActivityPricingBadge(
                        icon = Icons.Rounded.Star,
                        text = "Premium",
                        color = Color(0xFFFFD66E),
                    )
                }
                if (activity.skillsFuturePayable) {
                    ActivityPricingBadge(
                        icon = Icons.Rounded.WorkspacePremium,
                        text = "SkillsFuture payable",
                        color = Color(0xFFB9F6CA),
                    )
                }
            }
        }
    }
}

@Composable
private fun ActivityPricingBadge(
    icon: ImageVector,
    text: String,
    color: Color,
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color.Black.copy(alpha = 0.58f),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(13.dp),
            )
            Text(
                text = text,
                color = color,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun ActivityTitleBlock(
    activity: ActivityDetails,
    isFavorited: Boolean,
    isFavoriteMutationInProgress: Boolean,
    onVendorClick: () -> Unit,
    onToggleFavorite: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 18.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = activity.title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
            Row(
                modifier = Modifier.padding(top = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Hosted by ",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = activity.vendor?.name ?: activity.host,
                    modifier = Modifier.clickable(
                        enabled = activity.vendor != null,
                        onClick = onVendorClick,
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = if (activity.vendor != null) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    fontWeight = FontWeight.SemiBold,
                )
            }
            FlowRow(
                modifier = Modifier.padding(top = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                activity.categories.forEach { category ->
                    CategoryPill(category)
                }
                if (activity.durationMinutes > 0) {
                    DetailPill(
                        icon = Icons.Rounded.Schedule,
                        label = formatDuration(activity.durationMinutes),
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }
            }
            if (activity.tags.isNotEmpty()) {
                FlowRow(
                    modifier = Modifier.padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                    verticalArrangement = Arrangement.spacedBy(5.dp),
                ) {
                    activity.tags.forEach { tag ->
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                        ) {
                            Text(
                                text = tag,
                                modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
        FilledIconButton(
            onClick = onToggleFavorite,
            enabled = !isFavoriteMutationInProgress,
            modifier = Modifier.size(44.dp),
        ) {
            Icon(
                imageVector = if (isFavorited) {
                    Icons.Rounded.Favorite
                } else {
                    Icons.Rounded.FavoriteBorder
                },
                contentDescription = if (isFavorited) {
                    "Remove from favorited activities"
                } else {
                    "Add to favorited activities"
                },
                tint = if (isFavorited) {
                    MaterialTheme.colorScheme.tertiary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
        }
    }
}

@Composable
private fun ActivityPaymentSummary(activity: ActivityDetails) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 16.dp),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "ACTIVITY PAYMENT",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                letterSpacing = 1.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = formatCredits(activity.credits),
                modifier = Modifier.padding(top = 7.dp),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold,
            )
            if (activity.isPremium || activity.skillsFuturePayable) {
                FlowRow(
                    modifier = Modifier.padding(top = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    if (activity.isPremium) {
                        DetailPill(
                            icon = Icons.Rounded.Star,
                            label = "Premium",
                            color = Color(0xFFB47A00),
                        )
                    }
                    if (activity.skillsFuturePayable) {
                        DetailPill(
                            icon = Icons.Rounded.WorkspacePremium,
                            label = "SkillsFuture payable",
                            color = Color(0xFF238B57),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryPill(category: String) {
    DetailPill(
        icon = categoryIcon(category),
        label = category.replaceFirstChar { it.titlecase(Locale.getDefault()) },
        color = categoryColor(category),
    )
}

@Composable
private fun DetailPill(
    icon: ImageVector,
    label: String,
    color: Color,
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = color.copy(alpha = 0.14f),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(14.dp))
            Text(text = label, color = color, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun FriendsCard(
    friends: List<ActivityFriend>,
    description: String,
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 16.dp),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "FRIENDS JOINING",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                letterSpacing = 1.sp,
                fontWeight = FontWeight.SemiBold,
            )
            FriendAvatars(
                friends = friends,
                modifier = Modifier.padding(top = 10.dp),
            )
            Text(
                text = description,
                modifier = Modifier.padding(top = 12.dp),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 19.sp,
            )
        }
    }
}

@Composable
private fun FriendAvatars(
    friends: List<ActivityFriend>,
    modifier: Modifier = Modifier,
    max: Int = 5,
) {
    if (friends.isEmpty()) {
        Text(
            text = "Be the first friend to join.",
            modifier = modifier,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        return
    }

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        friends.take(max).forEach { friend ->
            VidaAvatar(
                imageUrl = friend.avatarUrl,
                name = friend.name,
                modifier = Modifier.size(34.dp),
            )
            Spacer(Modifier.width(4.dp))
        }
        if (friends.size > max) {
            Text(
                text = "+${friends.size - max}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun AvailableSessions(
    activity: ActivityDetails,
    currentUserHandle: String,
    joiningSessionId: Long?,
    actionErrorMessage: String?,
    onJoinSession: (ActivitySession) -> Unit,
) {
    val openSessions = activity.sessions.filter { it.isOpen && it.isActive }

    Column(
        modifier = Modifier.padding(top = 18.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "AVAILABLE SESSIONS",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                letterSpacing = 1.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "${openSessions.size} open",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        actionErrorMessage?.let { message ->
            MessageCard(
                message = message,
                color = MaterialTheme.colorScheme.errorContainer,
                contentColor = MaterialTheme.colorScheme.onErrorContainer,
            )
        }
        activity.joinDisabledReason?.let { message ->
            if (actionErrorMessage == null) {
                MessageCard(
                    message = message,
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        if (openSessions.isEmpty()) {
            MessageCard(
                message = "No open sessions are available right now.",
                color = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            openSessions.forEach { session ->
                SessionCard(
                    session = session,
                    fallbackTitle = activity.title,
                    joined = session.participatingFriends.any {
                        it.handle.equals(currentUserHandle, ignoreCase = true)
                    },
                    isJoining = joiningSessionId == session.id,
                    joinEnabled = joiningSessionId == null &&
                        activity.joinDisabledReason == null,
                    onJoin = { onJoinSession(session) },
                )
            }
        }
    }
}

@Composable
private fun MessageCard(
    message: String,
    color: Color,
    contentColor: Color,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = color,
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(13.dp),
            style = MaterialTheme.typography.bodySmall,
            color = contentColor,
        )
    }
}

@Composable
private fun SessionCard(
    session: ActivitySession,
    fallbackTitle: String,
    joined: Boolean,
    isJoining: Boolean,
    joinEnabled: Boolean,
    onJoin: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = session.title.ifBlank { fallbackTitle },
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Row(
                        modifier = Modifier.padding(top = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        SessionFact(
                            icon = Icons.Rounded.CalendarMonth,
                            text = formatDate(session.startsAt),
                            modifier = Modifier.weight(1f),
                        )
                        SessionFact(
                            icon = Icons.Rounded.Schedule,
                            text = formatTime(session.startsAt),
                            modifier = Modifier.weight(1f),
                        )
                    }
                    Row(
                        modifier = Modifier.padding(top = 7.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        SessionFact(
                            icon = Icons.Rounded.LocationOn,
                            text = session.location,
                            modifier = Modifier.weight(1f),
                        )
                        SessionFact(
                            icon = Icons.Rounded.Groups,
                            text = "${session.spots} spots",
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                FriendAvatars(
                    friends = session.participatingFriends,
                    max = 4,
                )
                Button(
                    onClick = onJoin,
                    enabled = joinEnabled && !isJoining,
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 9.dp),
                    colors = ButtonDefaults.buttonColors(
                        disabledContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.55f),
                    ),
                ) {
                    if (isJoining) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary,
                        )
                        Spacer(Modifier.width(7.dp))
                    }
                    Text(
                        text = when {
                            isJoining -> "Joining..."
                            joined -> "Open group chat"
                            else -> "Join session"
                        },
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

@Composable
private fun SessionFact(
    icon: ImageVector,
    text: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(14.dp),
        )
        Text(
            text = text.ifBlank { "To be confirmed" },
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VendorSheet(
    vendor: ActivityVendor,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, bottom = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            VidaAvatar(
                imageUrl = vendor.profileUrl,
                name = vendor.name,
                modifier = Modifier.size(72.dp),
            )
            Text(
                text = vendor.name,
                modifier = Modifier.padding(top = 14.dp),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = vendor.description.ifBlank {
                    "This vendor has not added a description yet."
                },
                modifier = Modifier.padding(top = 10.dp),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 21.sp,
            )
        }
    }
}

private fun categoryIcon(category: String): ImageVector = when (category.lowercase()) {
    "physical" -> Icons.Rounded.DirectionsRun
    "cognitive" -> Icons.Rounded.Psychology
    "creative" -> Icons.Rounded.Palette
    else -> Icons.Rounded.Groups
}

private fun categoryColor(category: String): Color = when (category.lowercase()) {
    "physical" -> Color(0xFF35A765)
    "cognitive" -> Color(0xFF6475E8)
    "creative" -> Color(0xFFD64C9F)
    else -> Color(0xFF199CB1)
}

private fun formatDuration(minutes: Int): String = when {
    minutes <= 0 -> ""
    minutes < 60 -> "$minutes min"
    minutes % 60 == 0 -> "${minutes / 60} hr"
    else -> "${minutes / 60} hr ${minutes % 60} min"
}

private fun formatCredits(credits: Double): String = when {
    credits == 0.0 -> "Free"
    credits % 1.0 == 0.0 -> "${credits.toInt()} credits"
    else -> "$credits credits"
}

private fun formatDate(value: String): String =
    parseApiDate(value)?.let {
        SimpleDateFormat("EEE, d MMM", Locale.getDefault()).format(it)
    } ?: "Date TBC"

private fun formatTime(value: String): String =
    parseApiDate(value)?.let {
        SimpleDateFormat("h:mm a", Locale.getDefault()).format(it)
    } ?: "Time TBC"

private fun parseApiDate(value: String): Date? {
    val patterns = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSX",
        "yyyy-MM-dd'T'HH:mm:ssX",
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
    )

    return patterns.firstNotNullOfOrNull { pattern ->
        runCatching {
            SimpleDateFormat(pattern, Locale.US).apply {
                isLenient = false
            }.parse(value)
        }.getOrNull()
    }
}

@Preview(
    name = "Activity detail",
    showBackground = true,
    backgroundColor = 0xFFF3FBFC,
    widthDp = 390,
    heightDp = 844,
)
@Composable
private fun ActivityDetailPreview() {
    VidaTheme(darkTheme = false) {
        ActivityDetailContent(
            state = ActivityDetailUiState(
                activity = previewActivity,
                isLoading = false,
                isFavorited = true,
            ),
            currentUserHandle = "@alex",
            onBack = {},
            onRetry = {},
            onShare = {},
            onToggleFavorite = {},
            onJoinSession = {},
        )
    }
}

private val previewFriends = listOf(
    ActivityFriend(1, "Maya", "@maya", null),
    ActivityFriend(2, "Daniel", "@daniel", null),
    ActivityFriend(3, "Aisha", "@aisha", null),
)

private val previewActivity = ActivityDetails(
    id = 1,
    title = "Sunrise Nature Walk",
    description = "Take an easy-paced walk through Singapore's gardens with a friendly group.",
    host = "Vida Outdoors",
    durationMinutes = 90,
    categories = listOf("physical", "social"),
    tags = listOf("Outdoors", "Beginner friendly"),
    credits = 0.0,
    isPremium = false,
    skillsFuturePayable = false,
    coverUrl = null,
    vendor = ActivityVendor(
        id = "vendor-1",
        name = "Vida Outdoors",
        profileUrl = "",
        description = "Gentle outdoor experiences led by local guides.",
    ),
    sessions = listOf(
        ActivitySession(
            id = 101,
            title = "Sunday morning walk",
            startsAt = "2026-08-02T00:30:00.000Z",
            location = "Botanic Gardens MRT",
            durationMinutes = 90,
            spots = 8,
            registeredCount = 3,
            groupId = 22,
            isOpen = true,
            isActive = true,
            participatingFriends = previewFriends,
        ),
    ),
    participatingFriends = previewFriends,
    joinDisabledReason = null,
)
