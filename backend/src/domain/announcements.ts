export const announcementTypes = ["message", "poll"] as const;
export type AnnouncementType = (typeof announcementTypes)[number];

export type AnnouncementPollOption = {
  id: string;
  label: string;
};

export type AnnouncementPoll = {
  options: AnnouncementPollOption[];
  allowsMultiple: false;
};

export class AnnouncementPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnnouncementPayloadError";
  }
}

export function canPublishAnnouncementToSession(
  session: { isActive?: boolean } | null | undefined,
) {
  return session?.isActive !== false;
}

function requiredText(
  value: unknown,
  field: string,
  maximumLength: number,
) {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text) {
    throw new AnnouncementPayloadError(`${field} is required.`);
  }

  if (text.length > maximumLength) {
    throw new AnnouncementPayloadError(
      `${field} must be ${maximumLength} characters or less.`,
    );
  }

  return text;
}

export function normalizeAnnouncementPoll(input: {
  question?: unknown;
  options?: unknown;
}) {
  const question = requiredText(input.question, "Poll question", 200);
  const optionValues = Array.isArray(input.options) ? input.options : [];

  if (optionValues.length < 2 || optionValues.length > 6) {
    throw new AnnouncementPayloadError(
      "A poll must have between 2 and 6 options.",
    );
  }

  const labels = optionValues.map((option) =>
    requiredText(option, "Poll option", 100),
  );
  const normalizedLabels = labels.map((label) => label.toLocaleLowerCase());

  if (new Set(normalizedLabels).size !== normalizedLabels.length) {
    throw new AnnouncementPayloadError("Poll options must be unique.");
  }

  return {
    question,
    poll: {
      options: labels.map((label, index) => ({
        id: `option-${index + 1}`,
        label,
      })),
      allowsMultiple: false as const,
    },
  };
}
