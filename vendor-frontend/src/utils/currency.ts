const creditsToDollarsRate = 0.7;

export const currencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function convertCreditsToDollars(credits: number) {
  const safeCredits = Number.isFinite(credits) && credits > 0 ? credits : 0;

  return Math.round(safeCredits * creditsToDollarsRate * 100) / 100;
}

export function convertDollarsToCredits(dollars: number) {
  const safeDollars = Number.isFinite(dollars) && dollars > 0 ? dollars : 0;

  return Number((safeDollars / creditsToDollarsRate).toFixed(6));
}
