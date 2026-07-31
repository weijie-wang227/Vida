import {
  ActivityModel,
  SessionParticipationModel,
  SessionModel,
  type ActivityDocument,
  type SessionDocument,
  type VendorDocument,
} from "../models/VidaData.js";
import { getLinkedActivityIds } from "./utils.js";
import { countedRegistrationStatuses } from "../domain/sessionParticipation.js";
import { formatSessionDateTime } from "./date.js";
import {
  calculateRevenueBreakdownMinor,
  getVidaCommissionRate,
} from "../services/payments/commission.js";

export type FinancePeriodKey = "ytd" | "mtd";

type FinanceActivity = {
  id: string;
  title: string;
  sessionsNum: number;
  registeredCount: number;
  grossRevenue: number;
  commission: number;
  netRevenue: number;
  netRevenuePerSession: number;
  deltaVsAveragePercent: number;
};

type FinanceTrendPoint = {
  label: string;
  netRevenue: number;
};

export type FinancePeriod = {
  period: FinancePeriodKey;
  label: string;
  rangeLabel: string;
  grossRevenue: number;
  commission: number;
  netRevenue: number;
  netRevenueTrendPercent: number;
  bookings: number;
  bookingsTrendPercent: number;
  sessionsNum: number;
  averageNetPerSession: number;
  trend: FinanceTrendPoint[];
  activities: FinanceActivity[];
};

export type VendorFinance = {
  currency: "SGD";
  commissionRate: number;
  periods: Record<FinancePeriodKey, FinancePeriod>;
};

export type VendorFinanceActivity = {
  currency: "SGD";
  commissionRate: number;
  activity: {
    id: string;
    title: string;
    sessionsYtd: number;
  };
  summary: {
    sessionsThisMonth: number;
    grossRevenueThisMonth: number;
    commissionThisMonth: number;
    netRevenueThisMonth: number;
    averageAttendees: number;
    averageNetPerSession: number;
  };
  recentSessions: Array<{
    id: string;
    mockId: string;
    title: string;
    startsAt: string;
    registeredCount: number;
    grossRevenue: number;
    commission: number;
    netRevenue: number;
  }>;
};

type PeriodWindow = {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getRevenueBreakdown(
  grossRevenueMinor: unknown,
  commissionRate: number,
) {
  const breakdown = calculateRevenueBreakdownMinor(
    grossRevenueMinor,
    commissionRate,
  );

  return {
    grossRevenue: breakdown.grossRevenueMinor / 100,
    commission: breakdown.commissionMinor / 100,
    netRevenue: breakdown.netRevenueMinor / 100,
  };
}

function getTrendPercent(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function getPeriodWindow(period: FinancePeriodKey, now: Date): PeriodWindow {
  const currentEnd = new Date(now.getTime() + 1);

  if (period === "ytd") {
    const currentStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const previousStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const previousEnd = new Date(
      Date.UTC(
        now.getUTCFullYear() - 1,
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
        now.getUTCMilliseconds() + 1,
      ),
    );

    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  const currentStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const previousStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const previousMonthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const elapsed = now.getTime() - currentStart.getTime();
  const previousEnd = new Date(
    Math.min(previousStart.getTime() + elapsed + 1, previousMonthEnd.getTime()),
  );

  return { currentStart, currentEnd, previousStart, previousEnd };
}

function isWithin(value: unknown, start: Date, end: Date) {
  const time = new Date(String(value ?? "")).getTime();

  return Number.isFinite(time) && time >= start.getTime() && time < end.getTime();
}

function formatRange(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return `${formatter.format(start)} – ${formatter.format(
    new Date(end.getTime() - 1),
  )}`;
}

function getTrendPoints(
  period: FinancePeriodKey,
  now: Date,
  sessions: SessionDocument[],
  netRevenueBySessionId: Map<string, number>,
) {
  const getNetRevenue = (start: Date, end: Date) =>
    roundCurrency(
      sessions
        .filter((session) => isWithin(session.startsAt, start, end))
        .reduce(
          (sum, session) =>
            sum + (netRevenueBySessionId.get(String(session._id)) ?? 0),
          0,
        ),
    );

  if (period === "ytd") {
    return Array.from({ length: 5 }, (_, index) => {
      const year = now.getUTCFullYear() - 4 + index;
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(
        Math.min(
          Date.UTC(
            year,
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours(),
            now.getUTCMinutes(),
            now.getUTCSeconds(),
            now.getUTCMilliseconds() + 1,
          ),
          Date.UTC(year + 1, 0, 1),
        ),
      );

      return {
        label: String(year),
        netRevenue: getNetRevenue(start, end),
      };
    });
  }

  const formatter = new Intl.DateTimeFormat("en-SG", {
    month: "short",
    timeZone: "UTC",
  });
  const currentMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const elapsedMonthToDate = now.getTime() - currentMonthStart.getTime() + 1;

  return Array.from({ length: 12 }, (_, index) => {
    const monthOffset = index - 11;
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1),
    );
    const nextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset + 1, 1),
    );
    const end = new Date(
      Math.min(
        start.getTime() + elapsedMonthToDate,
        nextMonth.getTime(),
      ),
    );

    return {
      label: formatter.format(start),
      netRevenue: getNetRevenue(start, end),
    };
  });
}

function buildPeriod(
  period: FinancePeriodKey,
  now: Date,
  activities: ActivityDocument[],
  sessions: SessionDocument[],
  bookingsBySessionId: Map<string, number>,
  commissionRate: number,
): FinancePeriod {
  const window = getPeriodWindow(period, now);
  const currentSessions = sessions.filter((session) =>
    isWithin(session.startsAt, window.currentStart, window.currentEnd),
  );
  const previousSessions = sessions.filter((session) =>
    isWithin(session.startsAt, window.previousStart, window.previousEnd),
  );
  const grossRevenueBySessionId = new Map<string, number>();
  const commissionBySessionId = new Map<string, number>();
  const netRevenueBySessionId = new Map<string, number>();
  const activityById = new Map(
    activities.map((activity) => [String(activity._id), activity]),
  );

  sessions.forEach((session) => {
    const sessionId = String(session._id);
    const breakdown = getRevenueBreakdown(
      session.grossRevenueMinor,
      commissionRate,
    );

    grossRevenueBySessionId.set(
      sessionId,
      roundCurrency(breakdown.grossRevenue),
    );
    commissionBySessionId.set(
      sessionId,
      roundCurrency(breakdown.commission),
    );
    netRevenueBySessionId.set(
      sessionId,
      roundCurrency(breakdown.netRevenue),
    );
  });

  const getTotals = (rows: SessionDocument[]) =>
    rows.reduce(
      (totals, session) => {
        const sessionId = String(session._id);

        totals.bookings += bookingsBySessionId.get(sessionId) ?? 0;
        totals.grossRevenue += grossRevenueBySessionId.get(sessionId) ?? 0;
        totals.commission += commissionBySessionId.get(sessionId) ?? 0;
        totals.netRevenue += netRevenueBySessionId.get(sessionId) ?? 0;
        return totals;
      },
      { grossRevenue: 0, commission: 0, netRevenue: 0, bookings: 0 },
    );
  const currentTotals = getTotals(currentSessions);
  const previousTotals = getTotals(previousSessions);
  const averageNetPerSession = currentSessions.length > 0
    ? currentTotals.netRevenue / currentSessions.length
    : 0;
  const breakdownByActivityId = new Map<string, FinanceActivity>();

  currentSessions.forEach((session) => {
    const activityId = String(session.activity);
    const activity = activityById.get(activityId);

    if (!activity) {
      return;
    }

    const sessionId = String(session._id);
    const row = breakdownByActivityId.get(activityId) ?? {
      id: activityId,
      title: activity.title ?? "Untitled activity",
      sessionsNum: 0,
      registeredCount: 0,
      grossRevenue: 0,
      commission: 0,
      netRevenue: 0,
      netRevenuePerSession: 0,
      deltaVsAveragePercent: 0,
    };

    row.sessionsNum += 1;
    row.registeredCount += bookingsBySessionId.get(sessionId) ?? 0;
    row.grossRevenue += grossRevenueBySessionId.get(sessionId) ?? 0;
    row.commission += commissionBySessionId.get(sessionId) ?? 0;
    row.netRevenue += netRevenueBySessionId.get(sessionId) ?? 0;
    breakdownByActivityId.set(activityId, row);
  });

  const activityRows = Array.from(breakdownByActivityId.values())
    .map((activity) => {
      const netRevenuePerSession = activity.sessionsNum > 0
        ? activity.netRevenue / activity.sessionsNum
        : 0;
      const deltaVsAveragePercent = averageNetPerSession > 0
        ? Math.round(
            ((netRevenuePerSession - averageNetPerSession) /
              averageNetPerSession) *
              100,
          )
        : 0;

      return {
        ...activity,
        grossRevenue: roundCurrency(activity.grossRevenue),
        commission: roundCurrency(activity.commission),
        netRevenue: roundCurrency(activity.netRevenue),
        netRevenuePerSession: roundCurrency(netRevenuePerSession),
        deltaVsAveragePercent,
      };
    })
    .sort((first, second) => second.netRevenue - first.netRevenue);

  return {
    period,
    label: period.toUpperCase(),
    rangeLabel: formatRange(window.currentStart, window.currentEnd),
    grossRevenue: roundCurrency(currentTotals.grossRevenue),
    commission: roundCurrency(currentTotals.commission),
    netRevenue: roundCurrency(currentTotals.netRevenue),
    netRevenueTrendPercent: getTrendPercent(
      currentTotals.netRevenue,
      previousTotals.netRevenue,
    ),
    bookings: currentTotals.bookings,
    bookingsTrendPercent: getTrendPercent(
      currentTotals.bookings,
      previousTotals.bookings,
    ),
    sessionsNum: currentSessions.length,
    averageNetPerSession: roundCurrency(averageNetPerSession),
    trend: getTrendPoints(period, now, sessions, netRevenueBySessionId),
    activities: activityRows,
  };
}

export async function getVendorFinance(
  vendor: VendorDocument,
): Promise<VendorFinance> {
  const commissionRate = getVidaCommissionRate();
  const linkedActivityIds = getLinkedActivityIds(vendor);
  const activities = await ActivityModel.find({
    isVolunteer: { $ne: true },
    $or: [{ host: vendor._id }, { _id: { $in: linkedActivityIds } }],
  })
    .select("_id title sessionsNum registeredCount")
    .lean();
  const activityIds = activities.map((activity) => activity._id);
  const sessions = activityIds.length > 0
    ? await SessionModel.find({ activity: { $in: activityIds } })
        .select("_id activity startsAt grossRevenueMinor")
        .lean()
    : [];
  const sessionIds = sessions.map((session) => session._id);
  const participations = sessionIds.length > 0
    ? await SessionParticipationModel.find({
        sessionId: { $in: sessionIds },
        role: "participant",
        status: { $in: countedRegistrationStatuses },
      })
        .select("sessionId userId")
        .lean()
    : [];
  const vendorOwnerId = String(vendor.owner?._id ?? vendor.owner ?? "");
  const bookingsBySessionId = new Map<string, number>();

  participations.forEach((participation) => {
    if (vendorOwnerId && String(participation.userId) === vendorOwnerId) {
      return;
    }

    const sessionId = String(participation.sessionId);

    bookingsBySessionId.set(
      sessionId,
      (bookingsBySessionId.get(sessionId) ?? 0) + 1,
    );
  });
  const now = new Date();

  return {
    currency: "SGD",
    commissionRate,
    periods: {
      ytd: buildPeriod(
        "ytd",
        now,
        activities,
        sessions,
        bookingsBySessionId,
        commissionRate,
      ),
      mtd: buildPeriod(
        "mtd",
        now,
        activities,
        sessions,
        bookingsBySessionId,
        commissionRate,
      ),
    },
  };
}

export async function getVendorFinanceActivity(
  vendor: VendorDocument,
  activitySelector: Record<string, unknown>[],
): Promise<VendorFinanceActivity | null> {
  const commissionRate = getVidaCommissionRate();

  if (activitySelector.length === 0) {
    return null;
  }

  const linkedActivityIds = getLinkedActivityIds(vendor);
  const activity = await ActivityModel.findOne({
    $and: [
      { $or: activitySelector },
      { $or: [{ host: vendor._id }, { _id: { $in: linkedActivityIds } }] },
      { isVolunteer: { $ne: true } },
    ],
  })
    .select("_id title")
    .lean();

  if (!activity) {
    return null;
  }

  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const sessions = await SessionModel.find({
    activity: activity._id,
  })
    .select("_id mockId title startsAt grossRevenueMinor")
    .sort({ startsAt: -1, mockId: -1 })
    .lean();
  const sessionIds = sessions.map((session) => session._id);
  const participations = sessionIds.length > 0
    ? await SessionParticipationModel.find({
        sessionId: { $in: sessionIds },
        role: "participant",
        status: { $in: countedRegistrationStatuses },
      })
        .select("sessionId userId")
        .lean()
    : [];
  const ownerId = String(vendor.owner?._id ?? vendor.owner ?? "");
  const attendeesBySessionId = new Map<string, number>();

  participations.forEach((participation) => {
    if (ownerId && String(participation.userId) === ownerId) {
      return;
    }

    const sessionId = String(participation.sessionId);

    attendeesBySessionId.set(
      sessionId,
      (attendeesBySessionId.get(sessionId) ?? 0) + 1,
    );
  });

  const sessionRows = sessions.map((session) => {
    const registeredCount = attendeesBySessionId.get(String(session._id)) ?? 0;
    const revenue = getRevenueBreakdown(
      session.grossRevenueMinor,
      commissionRate,
    );

    return {
      id: String(session._id),
      mockId: String(session.mockId),
      title: session.title || formatSessionDateTime(session.startsAt),
      startsAt:
        session.startsAt instanceof Date
          ? session.startsAt.toISOString()
          : new Date(session.startsAt).toISOString(),
      registeredCount,
      grossRevenue: roundCurrency(revenue.grossRevenue),
      commission: roundCurrency(revenue.commission),
      netRevenue: roundCurrency(revenue.netRevenue),
    };
  });
  const sessionsThisMonth = sessionRows.filter(
    (session) => {
      const startsAt = new Date(session.startsAt).getTime();

      return startsAt >= monthStart.getTime() && startsAt <= now.getTime();
    },
  );
  const sessionsYtd = sessionRows.filter(
    (session) => {
      const startsAt = new Date(session.startsAt).getTime();

      return startsAt >= yearStart.getTime() && startsAt <= now.getTime();
    },
  ).length;
  const grossRevenueThisMonth = sessionsThisMonth.reduce(
    (sum, session) => sum + session.grossRevenue,
    0,
  );
  const commissionThisMonth = sessionsThisMonth.reduce(
    (sum, session) => sum + session.commission,
    0,
  );
  const netRevenueThisMonth = sessionsThisMonth.reduce(
    (sum, session) => sum + session.netRevenue,
    0,
  );
  const attendeesThisMonth = sessionsThisMonth.reduce(
    (sum, session) => sum + session.registeredCount,
    0,
  );

  return {
    currency: "SGD",
    commissionRate,
    activity: {
      id: String(activity._id),
      title: String(activity.title ?? "Untitled activity"),
      sessionsYtd,
    },
    summary: {
      sessionsThisMonth: sessionsThisMonth.length,
      grossRevenueThisMonth: roundCurrency(grossRevenueThisMonth),
      commissionThisMonth: roundCurrency(commissionThisMonth),
      netRevenueThisMonth: roundCurrency(netRevenueThisMonth),
      averageAttendees:
        sessionsThisMonth.length > 0
          ? Math.round((attendeesThisMonth / sessionsThisMonth.length) * 10) / 10
          : 0,
      averageNetPerSession:
        sessionsThisMonth.length > 0
          ? roundCurrency(netRevenueThisMonth / sessionsThisMonth.length)
          : 0,
    },
    recentSessions: sessionRows,
  };
}
