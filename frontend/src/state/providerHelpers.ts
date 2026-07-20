import type {
  Activity,
  ActivityId,
  GroupChat,
} from "../lib/types";

export function replaceActivity<T extends Activity>(items: T[], activity: T) {
  return items.map((item) => (item.id === activity.id ? activity : item));
}

export function mergeActivityUpdate<T extends Activity>(items: T[], activity: T) {
  return items.map((item) => {
    if (item.id !== activity.id) {
      return item;
    }

    const sessionsById = new Map(
      (item.sessions ?? []).map((session) => [String(session.id), session]),
    );

    for (const session of activity.sessions ?? []) {
      sessionsById.set(String(session.id), {
        ...sessionsById.get(String(session.id)),
        ...session,
      });
    }

    return {
      ...item,
      ...activity,
      sessions: Array.from(sessionsById.values()).sort(
        (firstSession, secondSession) =>
          new Date(firstSession.startsAt).getTime() -
          new Date(secondSession.startsAt).getTime(),
      ),
    };
  });
}

export function activityIdsJoinedByProfile(
  activities: Activity[],
  profileHandle: string,
) {
  return activities
    .filter((activity) =>
      activity.participatingFriends.some(
        (friend) => friend.handle === profileHandle,
      ),
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
