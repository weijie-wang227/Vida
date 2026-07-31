import { AnnouncementVoteModel } from "../models/VidaData.js";
import { toIsoString } from "../utils/date.js";
import { asObject } from "../utils/mongoose.js";

export type AnnouncementPollResult = {
  voteCounts: Record<string, number>;
  selectedOptionId: string | null;
  totalVotes: number;
};

export function serializeAnnouncement(
  announcementValue: Record<string, any>,
  pollResults = new Map<string, AnnouncementPollResult>(),
  linkedChatValue?: unknown,
) {
  const announcement = asObject(announcementValue);
  const linkedChat =
    typeof linkedChatValue === "object" && linkedChatValue !== null
      ? asObject(linkedChatValue as Record<string, any>)
      : {};
  const storedChat =
    typeof announcement.chatId === "object" && announcement.chatId !== null
      ? asObject(announcement.chatId)
      : {};
  const chatId = String(
    storedChat._id ??
      announcement.chatId ??
      linkedChat._id ??
      linkedChatValue ??
      "",
  );
  const groupId = Number(storedChat.mockId ?? linkedChat.mockId);
  const type = announcement.type === "poll" ? "poll" : "message";
  const base = {
    id: String(announcement._id),
    sessionId: String(announcement.sessionId?._id ?? announcement.sessionId),
    chatId,
    ...(Number.isInteger(groupId) ? { groupId } : {}),
    type,
    content: String(announcement.content ?? ""),
    createdAt: toIsoString(announcement.createdAt),
  };

  if (type === "message") {
    return base;
  }

  const poll = asObject(announcement.poll ?? {});
  const result = pollResults.get(String(announcement._id)) ?? {
    voteCounts: {},
    selectedOptionId: null,
    totalVotes: 0,
  };

  return {
    ...base,
    poll: {
      options: (Array.isArray(poll.options) ? poll.options : []).map(
        (optionValue: Record<string, any>) => {
          const option = asObject(optionValue);
          const id = String(option.id ?? "");

          return {
            id,
            label: String(option.label ?? ""),
            votes: result.voteCounts[id] ?? 0,
            selected: result.selectedOptionId === id,
          };
        },
      ),
      allowsMultiple: false,
      totalVotes: result.totalVotes,
    },
  };
}

export async function getAnnouncementPollResults(
  announcements: Record<string, any>[],
  userId: unknown,
) {
  const pollAnnouncementIds = announcements
    .map((announcement) => asObject(announcement))
    .filter((announcement) => announcement.type === "poll")
    .map((announcement) => announcement._id)
    .filter(Boolean);

  if (pollAnnouncementIds.length === 0) {
    return new Map<string, AnnouncementPollResult>();
  }

  const votes = (await AnnouncementVoteModel.find({
    announcementId: { $in: pollAnnouncementIds },
  }).lean()) as Record<string, any>[];
  const results = new Map<string, AnnouncementPollResult>();

  for (const announcementId of pollAnnouncementIds) {
    results.set(String(announcementId), {
      voteCounts: {},
      selectedOptionId: null,
      totalVotes: 0,
    });
  }

  for (const voteValue of votes) {
    const vote = asObject(voteValue);
    const announcementId = String(
      vote.announcementId?._id ?? vote.announcementId,
    );
    const result = results.get(announcementId);

    if (!result) {
      continue;
    }

    const optionId = String(vote.optionId ?? "");
    result.totalVotes += 1;
    result.voteCounts[optionId] = (result.voteCounts[optionId] ?? 0) + 1;

    if (String(vote.userId?._id ?? vote.userId) === String(userId)) {
      result.selectedOptionId = optionId;
    }
  }

  return results;
}
