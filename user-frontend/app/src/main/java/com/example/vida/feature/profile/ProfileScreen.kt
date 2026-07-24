package com.example.vida.feature.profile

import android.content.Intent
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.SupervisorAccount
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.vida.core.designsystem.component.VidaAvatar
import com.example.vida.domain.model.AuthUser
import com.example.vida.domain.model.Friend
import com.example.vida.domain.model.ProfileStat
import com.example.vida.domain.model.UserProfile

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    user: AuthUser,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val profile = state.profile ?: UserProfile(
        name = user.name,
        handle = user.handle,
        avatar = user.avatar,
        bio = user.bio,
        stats = emptyList(),
        account = null,
    )
    var showFriends by remember { mutableStateOf(false) }
    var friendQuery by remember { mutableStateOf("") }
    var editOpen by remember { mutableStateOf(false) }
    var menuOpen by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val visibleFriends = remember(friendQuery, state.friends) {
        val query = friendQuery.trim().lowercase()
        if (query.isBlank()) state.friends else state.friends.filter {
            "${it.name} ${it.handle}".lowercase().contains(query)
        }
    }

    Column(modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 14.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("My Profile", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            IconButton(onClick = viewModel::refresh) { Icon(Icons.Rounded.Refresh, "Refresh profile") }
            IconButton(onClick = { editOpen = true }) { Icon(Icons.Rounded.Edit, "Edit profile") }
            Box {
                IconButton(onClick = { menuOpen = true }) { Icon(Icons.Rounded.MoreVert, "Profile menu") }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(
                        text = { Column { Text(user.email, maxLines = 1, overflow = TextOverflow.Ellipsis); Text("Signed in", style = MaterialTheme.typography.labelSmall) } },
                        onClick = { menuOpen = false },
                    )
                    DropdownMenuItem(text = { Text("Sign out") }, leadingIcon = { Icon(Icons.AutoMirrored.Rounded.Logout, null) }, onClick = { menuOpen = false; onSignOut() })
                }
            }
        }

        if (state.isLoading && state.profile == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            return@Column
        }

        state.errorMessage?.let { MessageBanner(it, isError = true, onDismiss = viewModel::clearMessage) }
        state.feedback?.let { MessageBanner(it, isError = false, onDismiss = viewModel::clearMessage) }

        LazyColumn(Modifier.fillMaxSize()) {
            item {
                ProfileHeader(
                    profile = profile,
                    onShare = {
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, "Connect with ${profile.name} on Vida: ${profile.handle}")
                        }
                        context.startActivity(Intent.createChooser(intent, "Share profile"))
                    },
                )
            }
            item {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceVariant).padding(4.dp),
                ) {
                    ProfileTab("Add Friends", Icons.Rounded.PersonAdd, selected = !showFriends, Modifier.weight(1f)) { showFriends = false }
                    ProfileTab("Friends", Icons.Rounded.SupervisorAccount, selected = showFriends, Modifier.weight(1f)) { showFriends = true }
                }
                Spacer(Modifier.height(12.dp))
            }
            if (showFriends) {
                item {
                    OutlinedTextField(
                        value = friendQuery,
                        onValueChange = { friendQuery = it },
                        leadingIcon = { Icon(Icons.Rounded.Search, null) },
                        placeholder = { Text("Search friends") },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    )
                }
                if (visibleFriends.isEmpty()) {
                    item { EmptyProfileSection("Friends you add will appear here.") }
                } else {
                    items(visibleFriends, key = Friend::id) { friend ->
                        FriendRow(
                            friend = friend,
                            actionLabel = "Remove",
                            busy = state.busyFriendId == friend.id,
                            onAction = { viewModel.removeFriend(friend) },
                        )
                    }
                }
            } else {
                item {
                    var search by remember { mutableStateOf("") }
                    Column(Modifier.padding(horizontal = 16.dp)) {
                        OutlinedTextField(
                            value = search,
                            onValueChange = { search = it; viewModel.search(it) },
                            leadingIcon = { Icon(Icons.Rounded.Search, null) },
                            placeholder = { Text("Search handles") },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                        ) {
                            Column(Modifier.fillMaxWidth().padding(18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Rounded.PersonAdd, null, Modifier.size(34.dp), tint = MaterialTheme.colorScheme.primary)
                                Text("Share your handle", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 7.dp))
                                Text(profile.handle, color = MaterialTheme.colorScheme.primary)
                                TextButton(onClick = {
                                    val intent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "Add me on Vida: ${profile.handle}") }
                                    context.startActivity(Intent.createChooser(intent, "Share Vida handle"))
                                }) { Icon(Icons.Rounded.Share, null, Modifier.size(16.dp)); Spacer(Modifier.width(6.dp)); Text("Share") }
                            }
                        }
                    }
                }
                if (state.isSearching) {
                    item { Box(Modifier.fillMaxWidth().height(80.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(24.dp)) } }
                } else {
                    items(state.searchResults, key = Friend::id) { friend ->
                        val alreadyAdded = state.friends.any { it.id == friend.id || it.handle == friend.handle }
                        FriendRow(
                            friend = friend,
                            actionLabel = if (alreadyAdded) "Added" else "Add",
                            busy = state.busyFriendId == friend.id,
                            enabled = !alreadyAdded,
                            onAction = { viewModel.addFriend(friend) },
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    if (editOpen) {
        EditProfileSheet(
            profile = profile,
            isSaving = state.isSaving,
            onDismiss = { editOpen = false },
            onSave = { name, handle, bio, avatar -> viewModel.saveProfile(name, handle, bio, avatar) { editOpen = false } },
        )
    }
}

@Composable
private fun ProfileHeader(profile: UserProfile, onShare: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        VidaAvatar(profile.avatar, profile.name, Modifier.size(84.dp))
        Text(profile.name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp))
        Text(profile.handle, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelMedium)
        if (profile.bio.isNotBlank()) Text(profile.bio, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp).fillMaxWidth(0.78f))
        if (profile.stats.isNotEmpty()) {
            Row(Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 8.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                profile.stats.forEach { ProfileStatItem(it) }
            }
            HorizontalDivider()
        }
        profile.account?.let { account ->
            Row(Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ProfileInfoCard("Membership", account.membershipName, Modifier.weight(1f))
                ProfileInfoCard("Credits left", account.creditsLeft.toString(), Modifier.weight(1f))
            }
        }
        TextButton(onClick = onShare, modifier = Modifier.padding(top = 4.dp)) { Icon(Icons.Rounded.Share, null, Modifier.size(16.dp)); Spacer(Modifier.width(6.dp)); Text("Share profile") }
    }
}

@Composable
private fun ProfileStatItem(stat: ProfileStat) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(stat.value, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
        Text(stat.label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ProfileInfoCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.fillMaxWidth().padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun ProfileTab(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Row(
        modifier.clickable(onClick = onClick).clip(RoundedCornerShape(11.dp)).background(if (selected) MaterialTheme.colorScheme.surface else androidx.compose.ui.graphics.Color.Transparent).padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, Modifier.size(15.dp)); Spacer(Modifier.width(6.dp)); Text(label, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun FriendRow(
    friend: Friend,
    actionLabel: String,
    busy: Boolean,
    enabled: Boolean = true,
    onAction: () -> Unit,
) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        VidaAvatar(friend.avatar, friend.name, Modifier.size(40.dp))
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(friend.name, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(friend.handle, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Button(onClick = onAction, enabled = enabled && !busy) {
            if (busy) CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp) else Icon(if (enabled) Icons.Rounded.Add else Icons.Rounded.Check, null, Modifier.size(14.dp))
            Spacer(Modifier.width(5.dp)); Text(actionLabel)
        }
    }
    HorizontalDivider(Modifier.padding(horizontal = 16.dp))
}

@Composable
private fun EmptyProfileSection(text: String) {
    Box(Modifier.fillMaxWidth().height(140.dp), contentAlignment = Alignment.Center) { Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant) }
}

@Composable
private fun MessageBanner(message: String, isError: Boolean, onDismiss: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp).clip(RoundedCornerShape(12.dp)).background(if (isError) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.secondaryContainer).padding(start = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(message, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
        TextButton(onClick = onDismiss) { Text("Dismiss") }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditProfileSheet(
    profile: UserProfile,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onSave: (String, String, String, String?) -> Unit,
) {
    var name by remember(profile) { mutableStateOf(profile.name) }
    var handle by remember(profile) { mutableStateOf(profile.handle) }
    var bio by remember(profile) { mutableStateOf(profile.bio) }
    var avatar by remember(profile) { mutableStateOf(profile.avatar.orEmpty()) }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Edit Profile", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                FilledIconButton(onClick = { onSave(name, handle, bio, avatar.ifBlank { null }) }, enabled = name.isNotBlank() && handle.isNotBlank() && !isSaving) {
                    if (isSaving) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Icon(Icons.Rounded.Check, "Save profile")
                }
            }
            VidaAvatar(avatar.ifBlank { null }, name.ifBlank { "Profile" }, Modifier.align(Alignment.CenterHorizontally).padding(vertical = 12.dp).size(84.dp))
            OutlinedTextField(value = avatar, onValueChange = { avatar = it }, label = { Text("Profile photo URL") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = name, onValueChange = { name = it.take(80) }, label = { Text("Name") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
            OutlinedTextField(value = handle, onValueChange = { handle = it }, label = { Text("Handle") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
            OutlinedTextField(value = bio, onValueChange = { bio = it.take(240) }, label = { Text("Bio") }, minLines = 3, supportingText = { Text("${bio.length}/240") }, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
            Spacer(Modifier.height(28.dp))
        }
    }
}
