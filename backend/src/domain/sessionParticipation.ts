import type {
  SessionParticipationRole,
  SessionParticipationStatus,
} from "../models/VidaData.js";

export const countedRegistrationStatuses: SessionParticipationStatus[] = [
  "registered",
  "approved",
  "attended",
  "no_show",
];

export function countsAsRegistration(
  status: SessionParticipationStatus,
  role: SessionParticipationRole = "participant",
) {
  return role === "participant" && countedRegistrationStatuses.includes(status);
}

export function countsAsAttendance(
  status: SessionParticipationStatus,
  role: SessionParticipationRole = "participant",
) {
  return role === "participant" && status === "attended";
}

export function getAttendanceCounterDelta(
  previousStatus: SessionParticipationStatus,
  nextStatus: SessionParticipationStatus,
) {
  return Number(nextStatus === "attended") - Number(previousStatus === "attended");
}

export function getRegistrationCounterDelta(
  previousStatus: SessionParticipationStatus,
  nextStatus: SessionParticipationStatus,
) {
  return Number(countsAsRegistration(nextStatus)) -
    Number(countsAsRegistration(previousStatus));
}

export function resolveAttendanceStatus(value: unknown) {
  return value === "attended" || value === "no_show" || value === "registered"
    ? value
    : null;
}
