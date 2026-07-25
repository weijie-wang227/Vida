import {
  ActivityModel,
  ConversionRateModel,
  SessionParticipationModel,
  SessionModel,
} from "../models/VidaData.js";
import { getLinkedActivityIds } from "./utils.js";
import { countedRegistrationStatuses } from "../domain/sessionParticipation.js";

export const defaultCreditsToDollarsRate = 0.7;

export type FinancePeriodKey = "ytd" | "mtd";

type FinanceActivity = {
  id: string;
  title: string;
  sessionsNum: number;
  registeredCount: number;
  totalRevenue: number;
  revenuePerSession: number;
  deltaVsAveragePercent: number;
};

type FinanceTrendPoint = {
  label: string;
  revenue: number;
};

export type FinancePeriod = {
  period: FinancePeriodKey;
  label: string;
  rangeLabel: string;
  revenue: number;
  revenueTrendPercent: number;
  bookings: number;
  bookingsTrendPercent: number;
  sessionsNum: number;
  averagePerSession: number;
  trend: FinanceTrendPoint[];
  activities: FinanceActivity[];
};

export type VendorFinance = {
  currency: "SGD";
  conversionRate: number;
  periods: Record<FinancePeriodKey, FinancePeriod>;
};

export type VendorFinanceActivity = {
  currency: "SGD";
  conversionRate: number;
  activity: {
    id: string;
    title: string;
    sessionsYtd: number;
  };
  summary: {
    sessionsThisMonth: number;
    revenueThisMonth: number;
    averageAttendees: number;
    averagePerSession: number;
  };
  recentSessions: Array<{
    id: string;
    mockId: string;
    title: string;
    startsAt: string;
    registeredCount: number;
    revenue: number;
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

function getTrendPercent(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

export function convertCreditsToDollars(credits: number, rate: number) {
  const safeCredits = Number.isFinite(credits) && credits > 0 ? credits : 0;
  const safeRate = Number.isFinite(rate) && rate >= 0
    ? rate
    : defaultCreditsToDollarsRate;

  return roundCurrency(safeCredits * safeRate);
}

export async function getCreditsToDollarsRate() {
  const conversion = await ConversionRateModel.findOneAndUpdate(
    { key: "creditsToDollars" },
    {
      $setOnInsert: {
        key: "creditsToDollars",
        rate: defaultCreditsToDollarsRate,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).select("rate");
  const rate = Number(conversion?.rate);

  return Number.isFinite(rate) && rate >= 0
    ? rate
    : defaultCreditsToDollarsRate;
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
  sessions: Record<string, any>[],
  revenueBySessionId: Map<string, number>,
) {
  const getRevenue = (start: Date, end: Date) =>
    roundCurrency(
      sessions
        .filter((session) => isWithin(session.startsAt, start, end))
        .reduce(
          (sum, session) =>
            sum + (revenueBySessionId.get(String(session._id)) ?? 0),
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
        revenue: getRevenue(start, end),
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
      revenue: getRevenue(start, end),
    };
  });
}

function buildPeriod(
  period: FinancePeriodKey,
  now: Date,
  activities: Record<string, any>[],
  sessions: Record<string, any>[],
  joinsBySessionId: Map<string, number>,
  rate: number,
): FinancePeriod {
  const window = getPeriodWindow(period, now);
  const currentSessions = sessions.filter((session) =>
    isWithin(session.startsAt, window.currentStart, window.currentEnd),
  );
  const previousSessions = sessions.filter((session) =>
    isWithin(session.startsAt, window.previousStart, window.previousEnd),
  );
  const revenueBySessionId = new Map<string, number>();
  const activityById = new Map(
    activities.map((activity) => [String(activity._id), activity]),
  );

  sessions.forEach((session) => {
    const sessionId = String(session._id);
    const attendees = joinsBySessionId.get(sessionId) ?? 0;
    const activity = activityById.get(String(session.activity));
    const revenue =
      convertCreditsToDollars(Number(activity?.credits), rate) * attendees;

    revenueBySessionId.set(sessionId, roundCurrency(revenue));
  });

  const getTotals = (rows: Record<string, any>[]) =>
    rows.reduce(
      (totals, session) => {
        const sessionId = String(session._id);

        totals.bookings += joinsBySessionId.get(sessionId) ?? 0;
        totals.revenue += revenueBySessionId.get(sessionId) ?? 0;
        return totals;
      },
      { revenue: 0, bookings: 0 },
    );
  const currentTotals = getTotals(currentSessions);
  const previousTotals = getTotals(previousSessions);
  const averagePerSession = currentSessions.length > 0
    ? currentTotals.revenue / currentSessions.length
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
      totalRevenue: 0,
      revenuePerSession: 0,
      deltaVsAveragePercent: 0,
    };

    row.sessionsNum += 1;
    row.registeredCount += joinsBySessionId.get(sessionId) ?? 0;
    row.totalRevenue += revenueBySessionId.get(sessionId) ?? 0;
    breakdownByActivityId.set(activityId, row);
  });

  const activityRows = Array.from(breakdownByActivityId.values())
    .map((activity) => {
      const revenuePerSession = activity.sessionsNum > 0
        ? activity.totalRevenue / activity.sessionsNum
        : 0;
      const deltaVsAveragePercent = averagePerSession > 0
        ? Math.round(((revenuePerSession - averagePerSession) / averagePerSession) * 100)
        : 0;

      return {
        ...activity,
        totalRevenue: roundCurrency(activity.totalRevenue),
        revenuePerSession: roundCurrency(revenuePerSession),
        deltaVsAveragePercent,
      };
    })
    .sort((first, second) => second.totalRevenue - first.totalRevenue);

  return {
    period,
    label: period.toUpperCase(),
    rangeLabel: formatRange(window.currentStart, window.currentEnd),
    revenue: roundCurrency(currentTotals.revenue),
    revenueTrendPercent: getTrendPercent(
      currentTotals.revenue,
      previousTotals.revenue,
    ),
    bookings: currentTotals.bookings,
    bookingsTrendPercent: getTrendPercent(
      currentTotals.bookings,
      previousTotals.bookings,
    ),
    sessionsNum: currentSessions.length,
    averagePerSession: roundCurrency(averagePerSession),
    trend: getTrendPoints(period, now, sessions, revenueBySessionId),
    activities: activityRows,
  };
}

export async function getVendorFinance(
  vendor: Record<string, any>,
): Promise<VendorFinance> {
  const linkedActivityIds = getLinkedActivityIds(vendor);
  const activities = await ActivityModel.find({
    isVolunteer: { $ne: true },
    $or: [{ host: vendor._id }, { _id: { $in: linkedActivityIds } }],
  })
    .select("_id title credits sessionsNum registeredCount totalRevenue")
    .lean();
  const activityIds = activities.map((activity: Record<string, any>) => activity._id);
  const sessions = activityIds.length > 0
    ? await SessionModel.find({ activity: { $in: activityIds } })
        .select("_id activity startsAt")
        .lean()
    : [];
  const sessionIds = sessions.map((session: Record<string, any>) => session._id);
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
  const joinsBySessionId = new Map<string, number>();

  participations.forEach((participation: Record<string, any>) => {
    if (vendorOwnerId && String(participation.userId) === vendorOwnerId) {
      return;
    }

    const sessionId = String(participation.sessionId);

    joinsBySessionId.set(sessionId, (joinsBySessionId.get(sessionId) ?? 0) + 1);
  });
  const rate = await getCreditsToDollarsRate();
  const now = new Date();

  return {
    currency: "SGD",
    conversionRate: rate,
    periods: {
      ytd: buildPeriod("ytd", now, activities, sessions, joinsBySessionId, rate),
      mtd: buildPeriod("mtd", now, activities, sessions, joinsBySessionId, rate),
    },
  };
}

export async function getVendorFinanceActivity(
  vendor: Record<string, any>,
  activitySelector: Record<string, unknown>[],
): Promise<VendorFinanceActivity | null> {
  if (activitySelector.length === 0) {
    return null;
  }

  const linkedActivityIds = getLinkedActivityIds(vendor);
  const activity = (await ActivityModel.findOne({
    $and: [
      { $or: activitySelector },
      { $or: [{ host: vendor._id }, { _id: { $in: linkedActivityIds } }] },
      { isVolunteer: { $ne: true } },
    ],
  })
    .select("_id title credits")
    .lean()) as Record<string, any> | null;

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
    .select("_id mockId title startsAt")
    .sort({ startsAt: -1, mockId: -1 })
    .lean();
  const sessionIds = sessions.map((session: Record<string, any>) => session._id);
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

  participations.forEach((participation: Record<string, any>) => {
    if (ownerId && String(participation.userId) === ownerId) {
      return;
    }

    const sessionId = String(participation.sessionId);

    attendeesBySessionId.set(
      sessionId,
      (attendeesBySessionId.get(sessionId) ?? 0) + 1,
    );
  });

  const rate = await getCreditsToDollarsRate();
  const sessionRows = sessions.map((session: Record<string, any>) => {
    const registeredCount = attendeesBySessionId.get(String(session._id)) ?? 0;
    const revenue = roundCurrency(
      convertCreditsToDollars(Number(activity.credits), rate) * registeredCount,
    );

    return {
      id: String(session._id),
      mockId: String(session.mockId),
      title: String(session.title ?? activity.title),
      startsAt:
        session.startsAt instanceof Date
          ? session.startsAt.toISOString()
          : new Date(session.startsAt).toISOString(),
      registeredCount,
      revenue,
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
  const revenueThisMonth = sessionsThisMonth.reduce(
    (sum, session) => sum + session.revenue,
    0,
  );
  const attendeesThisMonth = sessionsThisMonth.reduce(
    (sum, session) => sum + session.registeredCount,
    0,
  );

  return {
    currency: "SGD",
    conversionRate: rate,
    activity: {
      id: String(activity._id),
      title: String(activity.title ?? "Untitled activity"),
      sessionsYtd,
    },
    summary: {
      sessionsThisMonth: sessionsThisMonth.length,
      revenueThisMonth: roundCurrency(revenueThisMonth),
      averageAttendees:
        sessionsThisMonth.length > 0
          ? Math.round((attendeesThisMonth / sessionsThisMonth.length) * 10) / 10
          : 0,
      averagePerSession:
        sessionsThisMonth.length > 0
          ? roundCurrency(revenueThisMonth / sessionsThisMonth.length)
          : 0,
    },
    recentSessions: sessionRows,
  };
}
