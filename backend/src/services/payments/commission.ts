export type RevenueBreakdownMinor = {
  grossRevenueMinor: number;
  commissionMinor: number;
  netRevenueMinor: number;
};

export class CommissionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommissionConfigurationError";
  }
}

export function getVidaCommissionRate() {
  const configuredPercent = process.env.VIDA_COMMISSION_PERCENT?.trim();
  const commissionPercent = Number(configuredPercent);

  if (
    !configuredPercent ||
    !Number.isFinite(commissionPercent) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    throw new CommissionConfigurationError(
      "VIDA_COMMISSION_PERCENT must be a number from 0 to 100.",
    );
  }

  return commissionPercent / 100;
}

export function calculateRevenueBreakdownMinor(
  grossRevenueMinor: unknown,
  commissionRate = getVidaCommissionRate(),
): RevenueBreakdownMinor {
  if (
    !Number.isFinite(commissionRate) ||
    commissionRate < 0 ||
    commissionRate > 1
  ) {
    throw new CommissionConfigurationError(
      "Vida commission rate must be between 0 and 1.",
    );
  }

  const normalizedGrossRevenueMinor = Number(grossRevenueMinor);
  const safeGrossRevenueMinor =
    Number.isFinite(normalizedGrossRevenueMinor) &&
    normalizedGrossRevenueMinor > 0
      ? Math.round(normalizedGrossRevenueMinor)
      : 0;
  const commissionMinor = Math.round(safeGrossRevenueMinor * commissionRate);

  return {
    grossRevenueMinor: safeGrossRevenueMinor,
    commissionMinor,
    netRevenueMinor: safeGrossRevenueMinor - commissionMinor,
  };
}
