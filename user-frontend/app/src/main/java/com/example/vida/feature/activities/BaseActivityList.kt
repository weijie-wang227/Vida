package com.example.vida.feature.activities

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.rounded.AccessTime
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Landscape
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.vida.domain.model.ActivitySummary
import java.text.SimpleDateFormat
import java.util.Locale

private val BaseListBlue = Color(0xFF2852A4)
private val BaseListPage = Color(0xFFF9FAF8)
private val BaseListText = Color(0xFF111827)
private val BaseListMutedText = Color(0xFF667085)

@Composable
fun BaseActivityList(
    title: String,
    activities: List<ActivitySummary>,
    favoriteActivityIds: Set<Long>,
    favoriteMutationIds: Set<Long>,
    isLoading: Boolean,
    errorMessage: String?,
    emptyMessage: String,
    onActivityClick: (Long) -> Unit,
    onFavoriteClick: (ActivitySummary) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
    onBackClick: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(BaseListPage),
    ) {
        BaseActivityListHeader(
            title = title,
            onBackClick = onBackClick,
        )

        when {
            isLoading && activities.isEmpty() -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = BaseListBlue)
                }
            }

            errorMessage != null && activities.isEmpty() -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = errorMessage,
                        color = BaseListMutedText,
                        fontSize = 14.sp,
                    )
                    Button(
                        onClick = onRetry,
                        modifier = Modifier.padding(top = 16.dp),
                    ) {
                        Text("Try again")
                    }
                }
            }

            activities.isEmpty() -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFFEAF0FF),
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.FavoriteBorder,
                            contentDescription = null,
                            tint = BaseListBlue,
                            modifier = Modifier.padding(18.dp),
                        )
                    }
                    Text(
                        text = emptyMessage,
                        modifier = Modifier.padding(top = 16.dp),
                        color = BaseListText,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(vertical = 12.dp),
                ) {
                    if (errorMessage != null) {
                        item {
                            Text(
                                text = errorMessage,
                                modifier = Modifier.padding(
                                    start = 20.dp,
                                    end = 20.dp,
                                    bottom = 8.dp,
                                ),
                                color = Color(0xFFB42318),
                                fontSize = 13.sp,
                            )
                        }
                    }

                    items(
                        items = activities,
                        key = ActivitySummary::id,
                    ) { activity ->
                        ActivityListCard(
                            activity = activity,
                            isFavorited = activity.id in favoriteActivityIds,
                            isFavoriteUpdating = activity.id in favoriteMutationIds,
                            onClick = { onActivityClick(activity.id) },
                            onFavoriteClick = { onFavoriteClick(activity) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun BaseActivityListHeader(
    title: String,
    onBackClick: (() -> Unit)?,
) {
    Surface(
        color = Color.White,
        shadowElevation = 2.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .padding(horizontal = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (onBackClick != null) {
                IconButton(onClick = onBackClick) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                        contentDescription = "Back",
                        tint = BaseListText,
                    )
                }
            } else {
                Spacer(Modifier.width(12.dp))
            }
            Text(
                text = title,
                modifier = Modifier.padding(start = 6.dp),
                color = BaseListText,
                fontSize = 21.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
fun ActivityListCard(
    activity: ActivitySummary,
    isFavorited: Boolean,
    isFavoriteUpdating: Boolean,
    onClick: () -> Unit,
    onFavoriteClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 18.dp, vertical = 6.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE6E8EC)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BaseActivityImage(
                activity = activity,
                modifier = Modifier
                    .size(94.dp)
                    .clip(RoundedCornerShape(14.dp)),
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 12.dp),
            ) {
                Text(
                    text = activity.title,
                    color = BaseListText,
                    fontSize = 16.sp,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                BaseActivityMeta(
                    icon = Icons.Rounded.LocationOn,
                    text = activity.location.ifBlank { "Location to be confirmed" },
                )
                BaseActivityMeta(
                    icon = Icons.Rounded.AccessTime,
                    text = formatBaseActivityTime(activity.startsAt),
                )
                activity.tags.firstOrNull()?.let { activityTag ->
                    Surface(
                        modifier = Modifier.padding(top = 6.dp),
                        shape = RoundedCornerShape(7.dp),
                        color = Color(0xFFEAF0FF),
                    ) {
                        Text(
                            text = activityTag,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                            color = BaseListBlue,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
            IconButton(
                onClick = onFavoriteClick,
                enabled = !isFavoriteUpdating,
            ) {
                Icon(
                    imageVector = if (isFavorited) {
                        Icons.Filled.Favorite
                    } else {
                        Icons.Rounded.FavoriteBorder
                    },
                    contentDescription = if (isFavorited) {
                        "Remove ${activity.title} from favorites"
                    } else {
                        "Add ${activity.title} to favorites"
                    },
                    tint = if (isFavorited) Color(0xFFE24D6A) else BaseListBlue,
                )
            }
        }
    }
}

@Composable
private fun BaseActivityImage(
    activity: ActivitySummary,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.background(
            Brush.linearGradient(
                listOf(Color(0xFFDBE7FF), Color(0xFFB7C9F2)),
            ),
        ),
        contentAlignment = Alignment.Center,
    ) {
        if (activity.coverUrl.isNullOrBlank()) {
            Icon(
                imageVector = Icons.Rounded.Landscape,
                contentDescription = null,
                tint = BaseListBlue.copy(alpha = 0.76f),
                modifier = Modifier.size(34.dp),
            )
        } else {
            AsyncImage(
                model = activity.coverUrl,
                contentDescription = activity.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
        }
    }
}

@Composable
private fun BaseActivityMeta(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String,
) {
    Row(
        modifier = Modifier.padding(top = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = BaseListMutedText,
            modifier = Modifier.size(14.dp),
        )
        Text(
            text = text,
            modifier = Modifier.padding(start = 5.dp),
            color = BaseListMutedText,
            fontSize = 11.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private fun formatBaseActivityTime(value: String): String {
    val parsed = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSX",
        "yyyy-MM-dd'T'HH:mm:ssX",
    ).firstNotNullOfOrNull { pattern ->
        runCatching {
            SimpleDateFormat(pattern, Locale.US).parse(value)
        }.getOrNull()
    } ?: return value.ifBlank { "Time to be confirmed" }

    return SimpleDateFormat("EEE, d MMM · h:mm a", Locale.US).format(parsed)
}
