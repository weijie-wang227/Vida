import type {
  Activity,
  ActivityId,
  GroupChat,
} from "../lib/types";

export function replaceActivity<T extends Activity>(items: T[], activity: T) {
  return items.map((item) => (item.id === activity.id ? activity : item));
}

export function activityIdsJoinedByProfile(
  activities: Activity[],
  profileHandle: string,
) {
  return activities
    .filter((activity) =>
      activity.joiningFriends.some((friend) => friend.handle === profileHandle),
    )
    .map((activity) => activity.id);
}

export function markRecentActivityId(
  activityIds: ActivityId[],
  activityId: ActivityId,
) {
  return [activityId, ...activityIds.filter((id) => id !== activityId)];
}

export function upsertGroup(items: GroupChat[], group: GroupChat) {
  const existing = items.some((item) => item.id === group.id);

  if (!existing) {
    return [group, ...items];
  }

  return items.map((item) => (item.id === group.id ? group : item));
}
