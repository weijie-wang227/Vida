import {
  ActivityModel,
  ConsolidatedModel,
  SessionParticipationModel,
  SessionModel,
  type ConsolidatedDocument,
  type SessionDocument,
  type VendorDocument,
} from "../models/VidaData.js";
import { countedRegistrationStatuses } from "../domain/sessionParticipation.js";
import { formatSessionDateTime } from "./date.js";

export type VendorStats = {
  revenue: number;
  newUsers: number;
  totalUsers: number;
};

export type VendorUsersPageSessionFillRate = {
  sessionId: string;
  sessionMockId: string;
  title: string;
  startsAt: string;
  label: string;
  booked: number;
  capacity: number;
  fillRate: number;
  status: "strong" | "warning" | "low";
};

export type VendorUsersPageStats = {
  totalBookings: number;
  totalBookingsTrendPercent: number;
  averageFillRate: number;
  sessionCount: number;
  noShowRate: number;
  noShowRateTrendPercent: number;
  repeatAttendeeRate: number;
  sessionFillRates: VendorUsersPageSessionFillRate[];
};

export function getLinkedActivityIds(vendor: VendorDocument) {
  if (Array.isArray(vendor.allActivities)) {
    return vendor.allActivities;
  }

  const legacyAllEvents = (
    vendor as VendorDocument & { allEvents?: VendorDocument["allActivities"] }
  ).allEvents;

  return Array.isArray(legacyAllEvents) ? legacyAllEvents : [];
}

function getPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function getTrendPercent(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function getSessionFillStatus(
  fillRate: number,
): VendorUsersPageSessionFillRate["status"] {
  if (fillRate >= 75) {
    return "strong";
  }

  return fillRate >= 40 ? "warning" : "low";
}

function formatSessionLabel(session: SessionDocument) {
  const startsAt = new Date(String(session.startsAt ?? ""));

  if (Number.isNaN(startsAt.getTime())) {
    return "Date and time unavailable";
  }

  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(startsAt);
}

function toSessionStartsAt(value: unknown) {
  const date = new Date(String(value ?? ""));

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function getConsolidatedUsers(consolidated: ConsolidatedDocument | null) {
  const rows = Array.isArray(consolidated?.users) ? consolidated.users : [];
  const usersById = new Map<string, { userId: string; joinedAt: number }>();

  rows.forEach((item) => {
    const userId = String(item.user ?? "");
    const joinedAt = new Date(String(item.joinedAt ?? "")).getTime();

    if (!userId || !Number.isFinite(joinedAt)) {
      return;
    }

    const existing = usersById.get(userId);

    if (!existing || joinedAt < existing.joinedAt) {
      usersById.set(userId, { userId, joinedAt });
    }
  });

  return Array.from(usersById.values());
}

async function getVendorSessions(vendor: VendorDocument) {
  const linkedEventIds = getLinkedActivityIds(vendor);
  const activities = await ActivityModel.find({
    $or: [{ host: vendor._id }, { _id: { $in: linkedEventIds } }],
  })
    .select("_id")
    .lean();
  const activityIds = activities.map((activity) => activity._id);

  return activityIds.length > 0
    ? SessionModel.find({ activity: { $in: activityIds } })
        .select("_id mockId title startsAt spots")
        .sort({ startsAt: -1, mockId: 1 })
        .lean()
    : [];
}

export async function getVendorStats(
  vendor: VendorDocument,
): Promise<VendorStats> {
  const linkedActivityIds = getLinkedActivityIds(vendor);
  const [consolidated, activities] = await Promise.all([
    ConsolidatedModel.findOne({ vendor: vendor._id }).select("users").lean(),
    ActivityModel.find({
      isVolunteer: { $ne: true },
      $or: [{ host: vendor._id }, { _id: { $in: linkedActivityIds } }],
    })
      .select("_id")
      .lean(),
  ]);
  const activityIds = activities.map((activity) => activity._id);
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const sessions = activityIds.length > 0
    ? await SessionModel.find({
        activity: { $in: activityIds },
        startsAt: { $gte: yearStart, $lte: now },
      })
        .select("_id activity grossRevenueMinor")
        .lean()
    : [];
  const revenue = sessions.reduce((total, session) => {
    const sessionRevenue =
      Math.max(0, Number(session.grossRevenueMinor) || 0) / 100;

    return total + sessionRevenue;
  }, 0);
  const users = getConsolidatedUsers(consolidated);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newUsers = users.filter((item) => item.joinedAt >= thirtyDaysAgo).length;

  return {
    revenue: Math.round((revenue + Number.EPSILON) * 100) / 100,
    newUsers,
    totalUsers: users.length,
  };
}

export async function getVendorUsersPageStats(
  vendor: VendorDocument,
): Promise<VendorUsersPageStats> {
  const sessions = await getVendorSessions(vendor);
  const sessionIds = sessions.map((session) => session._id);
  const joins = sessionIds.length
    ? await SessionParticipationModel.find({
        sessionId: { $in: sessionIds },
        role: "participant",
        status: { $in: countedRegistrationStatuses },
      })
        .select("sessionId userId status registeredAt createdAt")
        .lean()
    : [];
  const now = Date.now();
  const currentPeriodStart = now - 30 * 24 * 60 * 60 * 1000;
  const previousPeriodStart = now - 60 * 24 * 60 * 60 * 1000;
  const currentPeriodJoins = joins.filter((join) => {
    const createdAt = new Date(
      String(join.registeredAt ?? join.createdAt ?? ""),
    ).getTime();

    return Number.isFinite(createdAt) && createdAt >= currentPeriodStart;
  });
  const previousPeriodJoins = joins.filter((join) => {
    const createdAt = new Date(
      String(join.registeredAt ?? join.createdAt ?? ""),
    ).getTime();

    return (
      Number.isFinite(createdAt) &&
      createdAt >= previousPeriodStart &&
      createdAt < currentPeriodStart
    );
  });
  const startsAtBySessionId = new Map(
    sessions.map((session) => [
      String(session._id),
      new Date(String(session.startsAt ?? "")).getTime(),
    ]),
  );
  const attendanceOutcomes = joins.filter(
    (join) =>
      join.status === "attended" || join.status === "no_show",
  );
  const currentAttendanceOutcomes = attendanceOutcomes.filter(
    (join) => {
      const startsAt = startsAtBySessionId.get(String(join.sessionId));

      return startsAt !== undefined && startsAt >= currentPeriodStart && startsAt <= now;
    },
  );
  const previousAttendanceOutcomes = attendanceOutcomes.filter(
    (join) => {
      const startsAt = startsAtBySessionId.get(String(join.sessionId));

      return (
        startsAt !== undefined &&
        startsAt >= previousPeriodStart &&
        startsAt < currentPeriodStart
      );
    },
  );
  const noShowCount = attendanceOutcomes.filter(
    (join) => join.status === "no_show",
  ).length;
  const currentNoShowCount = currentAttendanceOutcomes.filter(
    (join) => join.status === "no_show",
  ).length;
  const previousNoShowCount = previousAttendanceOutcomes.filter(
    (join) => join.status === "no_show",
  ).length;
  const bookingsByUserId = new Map<string, number>();
  const bookingsBySessionId = new Map<string, number>();

  joins.forEach((join) => {
    const userId = String(join.userId ?? "");
    const sessionId = String(join.sessionId ?? "");

    bookingsByUserId.set(userId, (bookingsByUserId.get(userId) ?? 0) + 1);
    bookingsBySessionId.set(sessionId, (bookingsBySessionId.get(sessionId) ?? 0) + 1);
  });

  const repeatBookingCount = joins.filter(
    (join) =>
      (bookingsByUserId.get(String(join.userId ?? "")) ?? 0) > 1,
  ).length;
  const sessionFillRates = sessions.map((session) => {
    const sessionId = String(session._id);
    const booked = bookingsBySessionId.get(sessionId) ?? 0;
    const capacity = Number(session.spots) || 0;
    const fillRate = getPercent(booked, capacity);

    return {
      sessionId,
      sessionMockId: String(session.mockId),
      title: session.title || formatSessionDateTime(session.startsAt),
      startsAt: toSessionStartsAt(session.startsAt),
      label: formatSessionLabel(session),
      booked,
      capacity,
      fillRate,
      status: getSessionFillStatus(fillRate),
    };
  });
  const averageFillRate =
    sessionFillRates.length > 0
      ? Math.round(
          sessionFillRates.reduce((sum, session) => sum + session.fillRate, 0) /
            sessionFillRates.length,
        )
      : 0;
  const currentNoShowRate = getPercent(
    currentNoShowCount,
    currentAttendanceOutcomes.length,
  );
  const previousNoShowRate = getPercent(
    previousNoShowCount,
    previousAttendanceOutcomes.length,
  );

  return {
    totalBookings: joins.length,
    totalBookingsTrendPercent: getTrendPercent(
      currentPeriodJoins.length,
      previousPeriodJoins.length,
    ),
    averageFillRate,
    sessionCount: sessions.length,
    noShowRate: getPercent(noShowCount, attendanceOutcomes.length),
    noShowRateTrendPercent: currentNoShowRate - previousNoShowRate,
    repeatAttendeeRate: getPercent(repeatBookingCount, joins.length),
    sessionFillRates,
  };
}
