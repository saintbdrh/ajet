import type { Locale } from "@/lib/i18n";

export type LakeRoute = "tuul" | "city";
export const lakeTour = {
  mn: {
    title: "Хагийн Хар нуурын нисдэг тэрэгний аялал",
    origin: "ZMUB (Улаанбаатар)", lake: "Хагийн Хар нуур",
    tuul: "Туул голын район", city: "УБ хотын төв",
    springs: "Естийн рашаан", minj: "Минж голын район",
    notice: "Аялал эхлэхээс 2–3 хоногийн өмнө захиалгаа баталгаажуулна уу.",
  },
  en: {
    title: "Khagiin Khar Lake helicopter tour",
    origin: "ZMUB (Ulaanbaatar)", lake: "Khagiin Khar Lake",
    tuul: "Tuul River area", city: "Central Ulaanbaatar",
    springs: "Yestiin hot springs", minj: "Minj River area",
    notice: "Please confirm your booking 2–3 days before the tour begins.",
  },
} as const;

export function lakeStops(locale: Locale, route: LakeRoute) {
  const tour = lakeTour[locale];
  return [tour.origin, tour[route], tour.springs, tour.minj, tour.lake, tour[route], "ZMUB"];
}

export function lakeEnquiry(locale: Locale, route: unknown) {
  if (route !== "tuul" && route !== "city") return undefined;
  const tour = lakeTour[locale];
  return {
    from: tour.origin, to: tour.lake, roundTrip: true,
    notes: tour.title + "\n" + lakeStops(locale, route).join(" → "),
  };
}
