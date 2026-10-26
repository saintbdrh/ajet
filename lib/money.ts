export function currencyFractionDigits(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function majorToMinor(amount: string, currency: string): number {
  const digits = currencyFractionDigits(currency);
  const parts = amount.split(".");
  if ((parts[1]?.length ?? 0) > digits) {
    throw new Error(`This currency supports at most ${digits} decimal places.`);
  }
  const minor = Math.round(Number(amount) * (10 ** digits));
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error("Amount is outside the supported range.");
  return minor;
}

export function minorToMajor(amountMinor: number, currency: string): number {
  return amountMinor / (10 ** currencyFractionDigits(currency));
}

export function formatMinorAmount(amountMinor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-US", {
    style: "currency",
    currency,
  }).format(minorToMajor(amountMinor, currency));
}
