package com.example.vida.feature.groups

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
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Send
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.material3.AssistChip
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.vida.core.designsystem.component.VidaAvatar
import com.example.vida.domain.model.AuthUser
import com.example.vida.domain.model.ChatMessage
import com.example.vida.domain.model.GroupChat
import com.example.vida.domain.model.GroupMember

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupDetailScreen(
    groupId: Long,
    currentUser: AuthUser,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: GroupDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var draft by remember { mutableStateOf("") }
    var showMembers by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()

    LaunchedEffect(groupId) { viewModel.open(groupId) }
    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) listState.animateScrollToItem(state.messages.lastIndex)
    }

    Column(modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        GroupHeader(group = state.group, onBack = onBack, onMembers = { showMembers = true })
        state.errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.errorContainer).padding(10.dp))
        }
        when {
            state.isLoading && state.messages.isEmpty() -> Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            state.messages.isEmpty() -> Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) { Text("No messages yet.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            else -> LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(state.messages, key = { it.id }) { message ->
                    MessageItem(
                        message = message,
                        isMine = message.sender.id == currentUser.id || message.sender.handle == currentUser.handle,
                        isVoting = state.votingMessageId == message.id,
                        onVote = { optionId -> viewModel.vote(message.id, optionId) },
                    )
                }
            }
        }
        HorizontalDivider()
        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            VidaAvatar(currentUser.avatar, currentUser.name, Modifier.size(32.dp))
            Spacer(Modifier.width(8.dp))
            OutlinedTextField(
                value = draft,
                onValueChange = { if (it.length <= 1000) draft = it },
                placeholder = { Text("Message group") },
                singleLine = true,
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(7.dp))
            FilledIconButton(
                onClick = { viewModel.send(draft) { draft = "" } },
                enabled = draft.isNotBlank() && !state.isSending,
            ) {
                if (state.isSending) CircularProgressIndicator(Modifier.size(17.dp), strokeWidth = 2.dp) else Icon(Icons.Rounded.Send, "Send")
            }
        }
    }

    if (showMembers) {
        ModalBottomSheet(onDismissRequest = { showMembers = false }) {
            MembersSheet(state.group)
        }
    }
}

@Composable
private fun GroupHeader(group: GroupChat?, onBack: () -> Unit, onMembers: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) { Icon(Icons.Rounded.ArrowBack, "Back to groups") }
        if (group != null) VidaAvatar(group.avatar, group.name, Modifier.size(40.dp))
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(group?.name ?: "Group", fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${group?.members ?: 0} members", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (group?.isAdmin == true) AssistChip(onClick = onMembers, label = { Text("Admin") }, leadingIcon = { Icon(Icons.Rounded.Shield, null, Modifier.size(14.dp)) })
        IconButton(onClick = onMembers, enabled = group != null) { Icon(Icons.Rounded.Info, "Group information") }
    }
    HorizontalDivider()
}

@Composable
private fun MessageItem(
    message: ChatMessage,
    isMine: Boolean,
    isVoting: Boolean,
    onVote: (String) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start,
        verticalAlignment = Alignment.Bottom,
    ) {
        if (!isMine) {
            VidaAvatar(message.sender.avatar, message.sender.name, Modifier.size(30.dp))
            Spacer(Modifier.width(8.dp))
        }
        Column(horizontalAlignment = if (isMine) Alignment.End else Alignment.Start, modifier = Modifier.fillMaxWidth(0.82f)) {
            if (!isMine) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(message.sender.name, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                    if (message.sender.isAdmin) Icon(Icons.Rounded.Shield, null, Modifier.padding(start = 4.dp).size(12.dp), tint = MaterialTheme.colorScheme.primary)
                }
            }
            Surface(
                color = if (isMine) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                contentColor = if (isMine) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                shape = RoundedCornerShape(
                    topStart = 18.dp,
                    topEnd = 18.dp,
                    bottomStart = if (isMine) 18.dp else 4.dp,
                    bottomEnd = if (isMine) 4.dp else 18.dp,
                ),
            ) {
                when (message) {
                    is ChatMessage.Text -> Text(message.text, modifier = Modifier.padding(horizontal = 13.dp, vertical = 9.dp), style = MaterialTheme.typography.bodyMedium)
                    is ChatMessage.Poll -> PollMessage(message, isVoting, onVote)
                    is ChatMessage.ActivityInvite -> ActivityInviteMessage(message)
                }
            }
            Text(message.time, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 3.dp, start = 4.dp, end = 4.dp))
        }
    }
}

@Composable
private fun PollMessage(message: ChatMessage.Poll, isVoting: Boolean, onVote: (String) -> Unit) {
    Column(Modifier.padding(13.dp)) {
        Text(message.question, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(8.dp))
        message.options.forEach { option ->
            val selected = option.id == message.selectedOptionId
            Surface(
                modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp).clickable(enabled = !isVoting) { onVote(option.id) },
                color = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.3f) else MaterialTheme.colorScheme.background.copy(alpha = 0.35f),
                shape = RoundedCornerShape(12.dp),
            ) {
                Row(Modifier.padding(horizontal = 10.dp, vertical = 8.dp)) {
                    Text(option.text, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    Text(option.votes.toString(), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                }
            }
        }
        Text("${message.totalVotes} votes", style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 5.dp))
    }
}

@Composable
private fun ActivityInviteMessage(message: ChatMessage.ActivityInvite) {
    Column(Modifier.padding(13.dp)) {
        Text("Activity invitation", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
        Text(message.title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(vertical = 5.dp))
        Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Rounded.CalendarMonth, null, Modifier.size(14.dp)); Spacer(Modifier.width(5.dp)); Text(message.startsAt, style = MaterialTheme.typography.labelSmall) }
        Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Rounded.LocationOn, null, Modifier.size(14.dp)); Spacer(Modifier.width(5.dp)); Text(message.location, style = MaterialTheme.typography.labelSmall) }
        if (message.credits > 0) Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Rounded.WorkspacePremium, null, Modifier.size(14.dp)); Spacer(Modifier.width(5.dp)); Text("${message.credits} credits", style = MaterialTheme.typography.labelSmall) }
    }
}

@Composable
private fun MembersSheet(group: GroupChat?) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        Text(group?.name ?: "Members", style = MaterialTheme.typography.titleLarge)
        Text("${group?.members ?: 0} current members", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(12.dp))
        val members = group?.memberList.orEmpty().sortedWith(compareByDescending<GroupMember> { it.isAdmin }.thenBy { it.name })
        if (members.isEmpty()) {
            Box(Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) { Text("Member details are unavailable.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        } else {
            LazyColumn(Modifier.height(340.dp)) {
                items(members, key = GroupMember::id) { member ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                        VidaAvatar(member.avatar, member.name, Modifier.size(40.dp))
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(member.name, fontWeight = FontWeight.SemiBold)
                            Text(member.handle, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (member.isAdmin) AssistChip(onClick = {}, label = { Text("Admin") }, leadingIcon = { Icon(Icons.Rounded.Shield, null, Modifier.size(13.dp)) })
                    }
                    HorizontalDivider()
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}
