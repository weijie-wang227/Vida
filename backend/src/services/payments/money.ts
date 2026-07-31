export const sgdCurrency = "SGD" as const;
export const minimumHitPayAmountMinor = 30;

export function sgdToMinor(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round((amount + Number.EPSILON) * 100);
}

export function minorToSgd(value: unknown) {
  const amountMinor = Number(value);

  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    return 0;
  }

  return Math.round(amountMinor) / 100;
}

export function parseHitPayAmountToMinor(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalized = String(value).trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ""] = normalized.split(".");
  const amountMinor =
    Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));

  return Number.isSafeInteger(amountMinor) ? amountMinor : null;
}

export function formatSgdAmount(valueMinor: number) {
  return minorToSgd(valueMinor).toFixed(2);
}
