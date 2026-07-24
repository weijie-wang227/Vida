package com.example.vida.feature.activities

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.rounded.AccessTime
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.FitnessCenter
import androidx.compose.material.icons.rounded.LocalOffer
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.SelfImprovement
import androidx.compose.material.icons.rounded.SportsBasketball
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.example.vida.domain.model.ActivitySummary
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

private val VidaBlue = Color(0xFF2852A4)
private val VidaDeepBlue = Color(0xFF183C82)
private val VidaPage = Color(0xFFF9FAF8)
private val VidaText = Color(0xFF111827)
private val VidaMutedText = Color(0xFF667085)

private enum class ActivitySort {
    Location,
    Time,
}

@Composable
fun ActivitiesScreen(
    onActivityClick: (Long) -> Unit,
    onFavoritedActivitiesClick: () -> Unit,
    onCalendarClick: () -> Unit,
    onCollectionClick: (ActivityCollection) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ActivitiesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var searchQuery by rememberSaveable { mutableStateOf("") }
    var selectedTag by rememberSaveable { mutableStateOf<String?>(null) }
    var sortBy by rememberSaveable { mutableStateOf(ActivitySort.Time) }

    val visibleActivities = remember(
        uiState.activities,
        searchQuery,
        selectedTag,
        sortBy,
    ) {
        val query = searchQuery.trim().lowercase()
        val filtered = uiState.activities.filter { activity ->
            val matchesSearch = query.isEmpty() || listOf(
                activity.title,
                activity.host,
                activity.location,
                activity.tags.joinToString(" "),
            ).any { value -> value.lowercase().contains(query) }
            val matchesTag = selectedTag == null ||
                activity.tags.any { it.equals(selectedTag, ignoreCase = true) }

            matchesSearch && matchesTag
        }

        when (sortBy) {
            ActivitySort.Location -> filtered.sortedWith(
                compareBy<ActivitySummary> { it.location.lowercase() }
                    .thenBy { parseActivityTime(it.startsAt) }
                    .thenBy { it.title.lowercase() },
            )

            ActivitySort.Time -> filtered.sortedWith(
                compareBy<ActivitySummary> { parseActivityTime(it.startsAt) }
                    .thenBy { it.title.lowercase() },
            )
        }
    }
    val premiumActivities = visibleActivities.filter(ActivitySummary::isPremium)
    val upcomingActivities = visibleActivities.filterNot(ActivitySummary::isPremium)

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VidaPage),
    ) {
        PinnedDiscoveryHeader(
            searchQuery = searchQuery,
            onSearchQueryChange = { searchQuery = it },
            onFavoritedActivitiesClick = onFavoritedActivitiesClick,
            onCalendarClick = onCalendarClick,
        )

        uiState.favoritesErrorMessage?.let { message ->
            FavoriteErrorBanner(message)
        }

        when {
            uiState.isLoading && uiState.activities.isEmpty() -> LoadingState()
            uiState.errorMessage != null && uiState.activities.isEmpty() -> ErrorState(
                message = uiState.errorMessage.orEmpty(),
                onRetry = viewModel::refresh,
            )

            else -> ActivitiesContent(
                premiumActivities = premiumActivities,
                upcomingActivities = upcomingActivities,
                availableTags = uiState.availableTags,
                tagsErrorMessage = uiState.tagsErrorMessage,
                selectedTag = selectedTag,
                sortBy = sortBy,
                favoriteActivityIds = uiState.favoriteActivityIds,
                favoriteMutationIds = uiState.favoriteMutationIds,
                hasActiveQuery = searchQuery.isNotBlank() || selectedTag != null,
                onTagSelected = { tag ->
                    selectedTag = if (selectedTag == tag) null else tag
                },
                onSortSelected = { sortBy = it },
                onCollectionClick = onCollectionClick,
                onActivityClick = onActivityClick,
                onFavoriteClick = viewModel::toggleFavorite,
            )
        }
    }
}

@Composable
private fun PinnedDiscoveryHeader(
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onFavoritedActivitiesClick: () -> Unit,
    onCalendarClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(VidaDeepBlue, VidaBlue),
                ),
            )
            .padding(start = 20.dp, top = 12.dp, end = 20.dp, bottom = 14.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "SINGAPORE",
                    color = Color.White,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Medium,
                )
                Icon(
                    imageVector = Icons.Rounded.KeyboardArrowDown,
                    contentDescription = "Choose location",
                    tint = Color.White,
                    modifier = Modifier
                        .padding(start = 4.dp)
                        .size(20.dp),
                )
            }
            HeaderAction(
                icon = Icons.Rounded.FavoriteBorder,
                contentDescription = "View favorited activities",
                onClick = onFavoritedActivitiesClick,
            )
            Spacer(Modifier.width(8.dp))
            HeaderAction(
                icon = Icons.Rounded.CalendarMonth,
                contentDescription = "Activity calendar",
                onClick = onCalendarClick,
            )
        }

        Spacer(Modifier.height(12.dp))

        TextField(
            value = searchQuery,
            onValueChange = onSearchQueryChange,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            placeholder = {
                Text(
                    text = "Join an activity now",
                    color = Color(0xFF8B8B8B),
                    fontSize = 16.sp,
                )
            },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Rounded.Search,
                    contentDescription = null,
                    tint = Color(0xFF171717),
                )
            },
            singleLine = true,
            shape = RoundedCornerShape(22.dp),
            colors = TextFieldDefaults.colors(
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
                disabledContainerColor = Color.White,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
            ),
        )
    }
}

@Composable
private fun HeaderAction(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
) {
    IconButton(
        onClick = onClick,
        modifier = Modifier
            .size(42.dp)
            .background(Color.White.copy(alpha = 0.18f), CircleShape),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = Color.White,
        )
    }
}

@Composable
private fun FavoriteErrorBanner(message: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color(0xFFFFF1F0),
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 9.dp),
            color = Color(0xFFB42318),
            fontSize = 12.sp,
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ActivitiesContent(
    premiumActivities: List<ActivitySummary>,
    upcomingActivities: List<ActivitySummary>,
    availableTags: List<String>,
    tagsErrorMessage: String?,
    selectedTag: String?,
    sortBy: ActivitySort,
    favoriteActivityIds: Set<Long>,
    favoriteMutationIds: Set<Long>,
    hasActiveQuery: Boolean,
    onTagSelected: (String) -> Unit,
    onSortSelected: (ActivitySort) -> Unit,
    onCollectionClick: (ActivityCollection) -> Unit,
    onActivityClick: (Long) -> Unit,
    onFavoriteClick: (ActivitySummary) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 28.dp),
    ) {
        item {
            DiscoveryHero()
        }

        stickyHeader {
            SortControls(
                sortBy = sortBy,
                onSortSelected = onSortSelected,
            )
        }

        item {
            TagSelector(
                tags = availableTags,
                selectedTag = selectedTag,
                errorMessage = tagsErrorMessage,
                onTagSelected = onTagSelected,
            )
        }

        item {
            ActivityCollectionCarousel(
                onCollectionClick = onCollectionClick,
            )
        }

        if (premiumActivities.isNotEmpty()) {
            item {
                SectionHeading(
                    title = "Premium activities",
                    subtitle = "Elevated experiences picked for you",
                    icon = Icons.Rounded.Star,
                    iconTint = Color(0xFFE0A11C),
                )
            }
            item {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 18.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(
                        items = premiumActivities,
                        key = ActivitySummary::id,
                    ) { activity ->
                        PremiumActivityCard(
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

        item {
            SectionHeading(
                title = "All upcoming activities",
                subtitle = "Find your next thing to do",
                icon = Icons.Rounded.CalendarMonth,
                iconTint = VidaBlue,
            )
        }

        if (upcomingActivities.isEmpty()) {
            item {
                EmptyActivitiesState(hasActiveQuery = hasActiveQuery)
            }
        } else {
            items(
                items = upcomingActivities,
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

@Composable
private fun DiscoveryHero() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(218.dp)
            .clip(
                RoundedCornerShape(
                    bottomStart = 44.dp,
                    bottomEnd = 44.dp,
                ),
            )
            .background(
                Brush.horizontalGradient(
                    listOf(VidaBlue, Color(0xFF3769C3)),
                ),
            ),
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 22.dp, top = 18.dp)
                .size(126.dp)
                .background(Color.White.copy(alpha = 0.10f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Rounded.SportsBasketball,
                contentDescription = null,
                tint = Color(0xFFFFD166),
                modifier = Modifier.size(76.dp),
            )
        }
        Column(
            modifier = Modifier
                .fillMaxWidth(0.66f)
                .padding(start = 20.dp, top = 35.dp),
        ) {
            Text(
                text = "Discover. Join. Enjoy.",
                color = Color.White,
                fontSize = 26.sp,
                lineHeight = 31.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = "Find activities that fit your vibe and make every moment count.",
                color = Color.White.copy(alpha = 0.88f),
                fontSize = 15.sp,
                lineHeight = 22.sp,
            )
            Spacer(Modifier.height(13.dp))
            Surface(
                modifier = Modifier.size(34.dp),
                shape = CircleShape,
                color = Color.White,
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Rounded.ArrowForward,
                    contentDescription = null,
                    tint = VidaDeepBlue,
                    modifier = Modifier.padding(7.dp),
                )
            }
        }
    }
}

@Composable
private fun SortControls(
    sortBy: ActivitySort,
    onSortSelected: (ActivitySort) -> Unit,
) {
    Surface(
        color = VidaPage,
        shadowElevation = 3.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            SortPill(
                label = "Sort by Location",
                icon = Icons.Rounded.LocationOn,
                selected = sortBy == ActivitySort.Location,
                selectedColor = Color(0xFFE8F0FC),
                iconTint = Color(0xFF173B75),
                onClick = { onSortSelected(ActivitySort.Location) },
                modifier = Modifier.weight(1f),
            )
            SortPill(
                label = "Sort by Time",
                icon = Icons.Rounded.AccessTime,
                selected = sortBy == ActivitySort.Time,
                selectedColor = Color(0xFFEAF5E8),
                iconTint = Color(0xFF1B5E2E),
                onClick = { onSortSelected(ActivitySort.Time) },
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun SortPill(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    selectedColor: Color,
    iconTint: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier
            .height(48.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        color = if (selected) selectedColor else Color(0xFFF0F2F4),
        border = if (selected) null else BorderStroke(1.dp, Color(0xFFE6E8EC)),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(22.dp),
            )
            Text(
                text = label,
                modifier = Modifier.padding(start = 7.dp),
                color = VidaText,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
            )
            Icon(
                imageVector = Icons.Rounded.KeyboardArrowDown,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier
                    .padding(start = 2.dp)
                    .size(17.dp),
            )
        }
    }
}

@Composable
private fun TagSelector(
    tags: List<String>,
    selectedTag: String?,
    errorMessage: String?,
    onTagSelected: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp, bottom = 18.dp),
    ) {
        when {
            tags.isNotEmpty() -> {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    items(
                        items = tags,
                        key = { it },
                    ) { tag ->
                        TagItem(
                            tag = tag,
                            index = tags.indexOf(tag),
                            selected = selectedTag == tag,
                            onClick = { onTagSelected(tag) },
                        )
                    }
                }
            }

            errorMessage != null -> {
                Text(
                    text = "Activity tags are temporarily unavailable.",
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 18.dp),
                    color = VidaMutedText,
                    fontSize = 13.sp,
                )
            }
        }
    }
}

@Composable
private fun ActivityCollectionCarousel(
    onCollectionClick: (ActivityCollection) -> Unit,
) {
    val palette = listOf(
        Color(0xFFE8F4EA) to Color(0xFF287A3E),
        Color(0xFFFFF0D5) to Color(0xFF9A6500),
        Color(0xFFE5F3F8) to Color(0xFF15647E),
        Color(0xFFF8E7EE) to Color(0xFFA62B5C),
        Color(0xFFECE9FB) to Color(0xFF5542A8),
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
    ) {
        Text(
            text = "Explore activities",
            modifier = Modifier.padding(start = 18.dp, end = 18.dp, bottom = 10.dp),
            color = VidaText,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold,
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 18.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(
                items = ActivityCollection.entries,
                key = ActivityCollection::routeValue,
            ) { collection ->
                val index = ActivityCollection.entries.indexOf(collection)
                val (background, foreground) = palette[index % palette.size]

                Surface(
                    modifier = Modifier
                        .width(146.dp)
                        .height(132.dp)
                        .clickable { onCollectionClick(collection) },
                    shape = RoundedCornerShape(20.dp),
                    color = Color(0xFFF3F3F3),
                    border = BorderStroke(1.dp, Color(0xFFE8E8E8)),
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Surface(
                            modifier = Modifier.size(58.dp),
                            shape = RoundedCornerShape(16.dp),
                            color = background,
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = collection.mark,
                                    color = foreground,
                                    fontSize = if (collection.mark.length > 3) 12.sp else 17.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                )
                            }
                        }
                        Text(
                            text = collection.title,
                            modifier = Modifier.padding(top = 9.dp),
                            color = VidaText,
                            fontSize = 13.sp,
                            lineHeight = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TagItem(
    tag: String,
    index: Int,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val palette = listOf(
        Color(0xFFE9EBFB) to Color(0xFF4053A5),
        Color(0xFFE8F3E5) to Color(0xFF2F7D32),
        Color(0xFFFBEBDD) to Color(0xFFD35419),
        Color(0xFFF8E4EA) to Color(0xFFC62E53),
    )
    val (background, foreground) = palette[index % palette.size]

    Column(
        modifier = Modifier
            .width(82.dp)
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Surface(
            modifier = Modifier.size(64.dp),
            shape = CircleShape,
            color = if (selected) foreground else background,
            border = if (selected) BorderStroke(3.dp, Color.White) else null,
            shadowElevation = if (selected) 4.dp else 0.dp,
        ) {
            Icon(
                imageVector = tagIcon(tag),
                contentDescription = null,
                tint = if (selected) Color.White else foreground,
                modifier = Modifier.padding(17.dp),
            )
        }
        Text(
            text = tag,
            modifier = Modifier.padding(top = 7.dp),
            color = if (selected) foreground else VidaText,
            fontSize = 12.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private fun tagIcon(tag: String): ImageVector {
    val value = tag.lowercase()
    return when {
        value.contains("sport") || value.contains("basket") ||
            value.contains("fitness") -> Icons.Rounded.FitnessCenter

        value.contains("well") || value.contains("yoga") ||
            value.contains("mind") -> Icons.Rounded.SelfImprovement

        value.contains("music") || value.contains("dance") ->
            Icons.Rounded.MusicNote

        value.contains("art") || value.contains("craft") ||
            value.contains("creative") -> Icons.Rounded.Palette

        else -> Icons.Rounded.LocalOffer
    }
}

@Composable
private fun SectionHeading(
    title: String,
    subtitle: String,
    icon: ImageVector,
    iconTint: Color,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 18.dp, top = 14.dp, end = 18.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Surface(
            modifier = Modifier.size(36.dp),
            shape = CircleShape,
            color = iconTint.copy(alpha = 0.12f),
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.padding(9.dp),
            )
        }
        Column(modifier = Modifier.padding(start = 10.dp)) {
            Text(
                text = title,
                color = VidaText,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = subtitle,
                color = VidaMutedText,
                fontSize = 12.sp,
            )
        }
    }
}

@Composable
private fun PremiumActivityCard(
    activity: ActivitySummary,
    isFavorited: Boolean,
    isFavoriteUpdating: Boolean,
    onClick: () -> Unit,
    onFavoriteClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .width(236.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        ActivityImage(
            activity = activity,
            modifier = Modifier
                .fillMaxWidth()
                .height(142.dp),
        )
        Column(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
        ) {
            Text(
                text = activity.title,
                color = VidaText,
                fontSize = 16.sp,
                lineHeight = 20.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            ActivityMeta(
                icon = Icons.Rounded.LocationOn,
                text = activity.location.ifBlank { "Location to be confirmed" },
            )
            ActivityMeta(
                icon = Icons.Rounded.AccessTime,
                text = formatActivityTime(activity.startsAt),
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFFFF4D8),
                ) {
                    Text(
                        text = "Premium",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        color = Color(0xFF9A6500),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Spacer(Modifier.weight(1f))
                IconButton(
                    onClick = onFavoriteClick,
                    enabled = !isFavoriteUpdating,
                    modifier = Modifier.size(36.dp),
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
                        tint = if (isFavorited) Color(0xFFE24D6A) else VidaBlue,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun ActivityImage(
    activity: ActivitySummary,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .background(
                Brush.linearGradient(
                    listOf(Color(0xFFDBE7FF), Color(0xFFB7C9F2)),
                ),
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (activity.coverUrl.isNullOrBlank()) {
            Icon(
                imageVector = tagIcon(activity.tags.firstOrNull().orEmpty()),
                contentDescription = null,
                tint = VidaBlue.copy(alpha = 0.76f),
                modifier = Modifier
                    .fillMaxSize(0.38f)
                    .aspectRatio(1f),
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
private fun ActivityMeta(
    icon: ImageVector,
    text: String,
) {
    Row(
        modifier = Modifier.padding(top = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = VidaMutedText,
            modifier = Modifier.size(14.dp),
        )
        Text(
            text = text,
            modifier = Modifier.padding(start = 5.dp),
            color = VidaMutedText,
            fontSize = 11.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun EmptyActivitiesState(hasActiveQuery: Boolean) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 32.dp, vertical = 38.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            imageVector = Icons.Rounded.Tune,
            contentDescription = null,
            tint = VidaMutedText,
            modifier = Modifier.size(32.dp),
        )
        Text(
            text = if (hasActiveQuery) {
                "No upcoming activities match your search."
            } else {
                "No upcoming activities yet."
            },
            modifier = Modifier.padding(top = 10.dp),
            color = VidaMutedText,
            fontSize = 14.sp,
        )
    }
}

@Composable
private fun LoadingState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(color = VidaBlue)
    }
}

@Composable
private fun ErrorState(
    message: String,
    onRetry: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(horizontal = 24.dp),
            color = MaterialTheme.colorScheme.error,
        )
        Spacer(Modifier.height(12.dp))
        Button(onClick = onRetry) {
            Text("Retry")
        }
    }
}

private fun parseActivityTime(value: String): Long {
    if (value.isBlank()) {
        return Long.MAX_VALUE
    }

    val patterns = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
    )

    return patterns.firstNotNullOfOrNull { pattern ->
        runCatching {
            SimpleDateFormat(pattern, Locale.US).parse(value)?.time
        }.getOrNull()
    } ?: Long.MAX_VALUE
}

private fun formatActivityTime(value: String): String {
    val timestamp = parseActivityTime(value)
    if (timestamp == Long.MAX_VALUE) {
        return "Time to be confirmed"
    }

    val activityDate = Calendar.getInstance().apply { timeInMillis = timestamp }
    val today = Calendar.getInstance()
    val tomorrow = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, 1) }
    val dayLabel = when {
        activityDate.isSameDay(today) -> "Today"
        activityDate.isSameDay(tomorrow) -> "Tomorrow"
        else -> SimpleDateFormat("EEE, d MMM", Locale.getDefault())
            .format(Date(timestamp))
    }
    val timeLabel = SimpleDateFormat("h:mm a", Locale.getDefault())
        .format(Date(timestamp))

    return "$dayLabel, $timeLabel"
}

private fun Calendar.isSameDay(other: Calendar): Boolean =
    get(Calendar.ERA) == other.get(Calendar.ERA) &&
        get(Calendar.YEAR) == other.get(Calendar.YEAR) &&
        get(Calendar.DAY_OF_YEAR) == other.get(Calendar.DAY_OF_YEAR)
