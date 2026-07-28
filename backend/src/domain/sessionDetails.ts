import { getString } from "../utils/input.js";

const minimumSessionDurationMs = 15 * 60 * 1000;

function getFiniteNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function getDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));

  return Number.isNaN(date.getTime()) ? null : date;
}

export function readSessionDetails(input: Record<string, any>) {
  return {
    title: getString(input.title),
    instructor: getString(input.instructor),
    startsAt: getDate(input.startsAt),
    endAt: getDate(input.endAt),
    location: getString(input.location),
    lat: getFiniteNumber(input.lat ?? input.latitude),
    lng: getFiniteNumber(input.lng ?? input.longitude),
    spots: getFiniteNumber(input.spots),
    credits: getFiniteNumber(input.credits),
    isPremium: input.isPremium === true,
    skillsFuturePayable: input.skillsFuturePayable === true,
  };
}

export function makeVolunteerSessionFree(
  session: ReturnType<typeof readSessionDetails>,
) {
  return {
    ...session,
    credits: 0,
    isPremium: false,
    skillsFuturePayable: false,
  };
}

export function validateSessionDetails(
  session: ReturnType<typeof readSessionDetails>,
  minimumSpots = 1,
) {
  if (!session.title) {
    return "Session title is required.";
  }

  if (session.title.length > 160) {
    return "Session title must be 160 characters or less.";
  }

  if (!session.startsAt || !session.endAt || !session.location) {
    return "Session start date/time, end date/time, and location are required.";
  }

  if (session.instructor.length > 120) {
    return "Instructor must be 120 characters or less.";
  }

  if (
    session.lat === null ||
    session.lng === null ||
    session.lat < -90 ||
    session.lat > 90 ||
    session.lng < -180 ||
    session.lng > 180
  ) {
    return "Choose a valid session location.";
  }

  if (
    session.endAt.getTime() - session.startsAt.getTime() <
    minimumSessionDurationMs
  ) {
    return "Session end time must be at least 15 minutes after its start time.";
  }

  if (
    session.spots === null ||
    !Number.isInteger(session.spots) ||
    session.spots < minimumSpots
  ) {
    return minimumSpots > 1
      ? `Session spots cannot be lower than the ${minimumSpots} existing registrations.`
      : "Session spots must be a whole number of at least 1.";
  }

  if (session.credits === null || session.credits < 0) {
    return "Session credits cannot be negative.";
  }

  if (session.isPremium && session.skillsFuturePayable) {
    return "Choose only one paid session type.";
  }

  if (
    !session.isPremium &&
    !session.skillsFuturePayable &&
    session.credits !== 0
  ) {
    return "Free sessions must use 0 credits.";
  }

  return null;
}

