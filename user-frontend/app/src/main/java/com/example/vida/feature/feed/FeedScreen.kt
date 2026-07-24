package com.example.vida.feature.feed

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Send
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.example.vida.core.designsystem.component.VidaAvatar
import com.example.vida.domain.model.AuthUser
import com.example.vida.domain.model.FeedComment
import com.example.vida.domain.model.FeedPost
import java.time.Duration
import java.time.Instant
import kotlin.math.roundToInt

private val feedCategories = listOf("physical", "social", "cognitive", "creative")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    currentUser: AuthUser,
    onOpenGroup: (Long) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: FeedViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var composerOpen by remember { mutableStateOf(false) }
    var editPost by remember { mutableStateOf<FeedPost?>(null) }

    Box(modifier = modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 16.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Feed", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                IconButton(onClick = viewModel::refresh) {
                    Icon(Icons.Rounded.Refresh, contentDescription = "Refresh feed")
                }
            }

            state.errorMessage?.let { message ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                ) {
                    Row(Modifier.padding(start = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(message, color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                        IconButton(onClick = viewModel::clearError) { Icon(Icons.Rounded.Close, contentDescription = "Dismiss") }
                    }
                }
            }

            when {
                state.isLoading && state.posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                !state.isLoading && state.posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Your friends' activity will show up here.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                else -> LazyColumn(Modifier.fillMaxSize()) {
                    item {
                        AnimatedVisibility(visible = composerOpen) {
                            FeedComposer(
                                user = currentUser,
                                isPosting = state.isPosting,
                                onPost = { caption, categories, duration ->
                                    viewModel.createPost(caption, categories, duration) { composerOpen = false }
                                },
                            )
                        }
                    }
                    items(state.posts, key = FeedPost::id) { post ->
                        FeedPostCard(
                            post = post,
                            isOwnPost = post.handle == currentUser.handle,
                            onLike = { viewModel.toggleLike(post) },
                            onComments = { viewModel.openComments(post) },
                            onGroup = onOpenGroup,
                            onEdit = { editPost = post },
                            onDelete = { viewModel.deletePost(post.id) },
                        )
                    }
                    item { Spacer(Modifier.height(88.dp)) }
                }
            }
        }

        FloatingActionButton(
            onClick = { composerOpen = !composerOpen },
            modifier = Modifier.align(Alignment.BottomEnd).padding(18.dp),
            shape = CircleShape,
        ) {
            Icon(if (composerOpen) Icons.Rounded.Close else Icons.Rounded.Add, contentDescription = if (composerOpen) "Close composer" else "Create post")
        }
    }

    state.selectedPost?.let { post ->
        CommentsSheet(
            post = post,
            comments = state.comments,
            isLoading = state.isLoadingComments,
            isSending = state.isSendingComment,
            currentUser = currentUser,
            onDismiss = viewModel::closeComments,
            onSend = viewModel::sendComment,
        )
    }

    editPost?.let { post ->
        EditPostDialog(
            post = post,
            onDismiss = { editPost = null },
            onSave = { caption -> viewModel.updatePost(post.id, caption) { editPost = null } },
        )
    }
}

@Composable
private fun FeedComposer(
    user: AuthUser,
    isPosting: Boolean,
    onPost: (String, List<String>, Int) -> Unit,
) {
    var caption by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf(setOf("social")) }
    var duration by remember { mutableStateOf(60f) }
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(6.dp),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                VidaAvatar(user.avatar, user.name, Modifier.size(38.dp))
                Spacer(Modifier.width(10.dp))
                OutlinedTextField(
                    value = caption,
                    onValueChange = { if (it.length <= 1200) caption = it },
                    placeholder = { Text("Share something with your friends") },
                    modifier = Modifier.weight(1f),
                    minLines = 3,
                    maxLines = 6,
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(top = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                feedCategories.forEach { category ->
                    FilterChip(
                        selected = category in selected,
                        onClick = { selected = if (category in selected) selected - category else selected + category },
                        label = { Text(category.replaceFirstChar(Char::uppercase)) },
                    )
                }
            }
            Text("${formatDuration(duration.roundToInt())} activity", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Slider(value = duration, onValueChange = { duration = it }, valueRange = 15f..360f, steps = 22)
            Button(
                onClick = { onPost(caption, selected.toList(), duration.roundToInt()) },
                enabled = caption.isNotBlank() && selected.isNotEmpty() && !isPosting,
                modifier = Modifier.align(Alignment.End),
            ) {
                if (isPosting) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Icon(Icons.Rounded.Send, contentDescription = null, Modifier.size(16.dp))
                Spacer(Modifier.width(7.dp))
                Text(if (isPosting) "Posting" else "Post")
            }
        }
    }
}

@Composable
private fun FeedPostCard(
    post: FeedPost,
    isOwnPost: Boolean,
    onLike: () -> Unit,
    onComments: () -> Unit,
    onGroup: (Long) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            VidaAvatar(post.avatar, post.user, Modifier.size(38.dp))
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(post.user, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(relativeTime(post.createdAt), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    (post.group?.name ?: post.activity)?.let {
                        Text("  /  $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
            if (isOwnPost) Box {
                IconButton(onClick = { menuOpen = true }) { Icon(Icons.Rounded.MoreHoriz, contentDescription = "Post menu") }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(text = { Text("Edit") }, leadingIcon = { Icon(Icons.Rounded.Edit, null) }, onClick = { menuOpen = false; onEdit() })
                    DropdownMenuItem(text = { Text("Delete") }, leadingIcon = { Icon(Icons.Rounded.Delete, null) }, onClick = { menuOpen = false; onDelete() })
                }
            }
        }

        post.image?.takeIf(String::isNotBlank)?.let { image ->
            AsyncImage(
                model = image,
                contentDescription = "Post by ${post.user}",
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxWidth().aspectRatio(4f / 3f).background(MaterialTheme.colorScheme.surfaceVariant),
            )
        }

        Column(Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
            post.group?.let { group ->
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { onGroup(group.id) },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                        VidaAvatar(group.avatar, group.name, Modifier.size(40.dp))
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(group.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                            Text("${group.members} members", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        AssistChip(onClick = { onGroup(group.id) }, label = { Text("Open") }, leadingIcon = { Icon(Icons.Rounded.Groups, null, Modifier.size(14.dp)) })
                    }
                }
                Spacer(Modifier.height(10.dp))
            }

            if (post.categories.isNotEmpty() && post.durationMinutes != null) {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    post.categories.forEach { CategoryPill(it) }
                    CategoryPill(formatDuration(post.durationMinutes), MaterialTheme.colorScheme.primary)
                }
                Spacer(Modifier.height(7.dp))
            }
            Text(post.caption, style = MaterialTheme.typography.bodyMedium)
            Row(Modifier.fillMaxWidth().padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onLike, modifier = Modifier.size(36.dp)) {
                    Icon(
                        if (post.likedByMe) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                        contentDescription = if (post.likedByMe) "Unlike" else "Like",
                        tint = if (post.likedByMe) Color(0xFFDC4AA7) else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(post.likesCount.toString(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(12.dp))
                IconButton(onClick = onComments, modifier = Modifier.size(36.dp)) { Icon(Icons.Outlined.ChatBubbleOutline, contentDescription = "Comments") }
                Text(post.comments.toString(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        HorizontalDivider(Modifier.padding(horizontal = 16.dp))
    }
}

@Composable
private fun CategoryPill(text: String, tint: Color = MaterialTheme.colorScheme.secondary) {
    Text(
        text = text.replaceFirstChar(Char::uppercase),
        color = tint,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.clip(CircleShape).background(tint.copy(alpha = 0.13f)).padding(horizontal = 9.dp, vertical = 5.dp),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CommentsSheet(
    post: FeedPost,
    comments: List<FeedComment>,
    isLoading: Boolean,
    isSending: Boolean,
    currentUser: AuthUser,
    onDismiss: () -> Unit,
    onSend: (String, () -> Unit) -> Unit,
) {
    var draft by remember { mutableStateOf("") }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
            Text("Comments", style = MaterialTheme.typography.titleLarge)
            Text("${post.user}'s post", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
            HorizontalDivider(Modifier.padding(vertical = 12.dp))
            when {
                isLoading -> Box(Modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                comments.isEmpty() -> Box(Modifier.fillMaxWidth().height(140.dp), contentAlignment = Alignment.Center) { Text("No comments yet", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                else -> LazyColumn(Modifier.height(260.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(comments, key = FeedComment::id) { comment -> CommentRow(comment) }
                }
            }
            Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                VidaAvatar(currentUser.avatar, currentUser.name, Modifier.size(34.dp))
                Spacer(Modifier.width(8.dp))
                OutlinedTextField(value = draft, onValueChange = { if (it.length <= 500) draft = it }, placeholder = { Text("Add a comment") }, singleLine = true, modifier = Modifier.weight(1f))
                Spacer(Modifier.width(6.dp))
                FilledIconButton(onClick = { onSend(draft) { draft = "" } }, enabled = draft.isNotBlank() && !isSending) {
                    if (isSending) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Icon(Icons.Rounded.Send, "Send comment")
                }
            }
        }
    }
}

@Composable
private fun CommentRow(comment: FeedComment) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        VidaAvatar(comment.avatar, comment.user, Modifier.size(34.dp))
        Spacer(Modifier.width(9.dp))
        Column(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceVariant).padding(10.dp)) {
            Row {
                Text(comment.user, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text(relativeTime(comment.createdAt), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(comment.body, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun EditPostDialog(post: FeedPost, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var caption by remember(post.id) { mutableStateOf(post.caption) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit post") },
        text = { OutlinedTextField(value = caption, onValueChange = { caption = it.take(1200) }, minLines = 3) },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        confirmButton = { Button(onClick = { onSave(caption) }, enabled = caption.isNotBlank()) { Text("Save") } },
    )
}

private fun formatDuration(minutes: Int): String = when {
    minutes < 60 -> "$minutes min"
    minutes % 60 == 0 -> "${minutes / 60} hr"
    else -> "${minutes / 60} hr ${minutes % 60} min"
}

private fun relativeTime(value: String): String = runCatching {
    val duration = Duration.between(Instant.parse(value), Instant.now())
    when {
        duration.toMinutes() < 1 -> "now"
        duration.toHours() < 1 -> "${duration.toMinutes()}m"
        duration.toDays() < 1 -> "${duration.toHours()}h"
        duration.toDays() < 7 -> "${duration.toDays()}d"
        else -> value.take(10)
    }
}.getOrDefault(value.take(10))
