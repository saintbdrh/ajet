"use client";
import { serviceName } from "@/lib/journey";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import { previewQuotes } from "@/lib/admin-preview";
import { cmsFields, defaultCopyValue } from "@/lib/cms-fields";
import { t, type Locale } from "@/lib/i18n";
import { adminConfirm, adminStatusText, adminText, cmsFieldText, cmsSectionText } from "@/lib/admin-dictionary";
import ImagePicker from "@/components/ImagePicker";
import AdminHistory from "@/components/AdminHistory";
import { defaultMediaSlots, mediaUrl, slotStill, type MediaSlot } from "@/lib/media";
import { minorToMajor } from "@/lib/money";
import type { AdminAircraft, AdminDestination, AdminQuote, DispatchAircraft, QuoteHistory, QuoteRevision } from "@/lib/admin-types";
import type { AdminRole } from "@/lib/admin";

type Tab = "content" | "photos" | "prices" | "aircraft" | "destinations" | "quotes";
type CopyResponse = { values: Record<Locale, Record<string, string>> };
type ItemsResponse<T> = { items: T[] };
type AdminPhoto = MediaSlot & { updatedAt?: string; previous?: Partial<MediaSlot> | null; previousRevisionId?: number | null };
type AdminPrice = {
  id: string; kind: "route" | "hourly" | "membership" | "other"; labelMn: string; labelEn: string;
  noteMn: string; noteEn: string; amountMinor: number; currency: string;
  unit: "per_flight" | "per_hour" | "per_package"; destinationId: string | null;
  aircraftId: string | null; isPublished: boolean; orderIndex: number; updatedAt?: string;
};
type PriceDraft = Omit<AdminPrice, "amountMinor"> & { amount: string };
type QuotePriceSuggestion = {
  id: string; label_mn: string; label_en: string; amount_minor: number; currency: string;
  destination_id: string | null; destination_mn: string | null; destination_en: string | null;
};

const allTabs: { id: Tab; label: Parameters<typeof adminText>[1] }[] = [
  { id: "content", label: "content" },
  { id: "photos", label: "photos" },
  { id: "prices", label: "prices" },
  { id: "aircraft", label: "aircraft" },
  { id: "destinations", label: "destinations" },
  { id: "quotes", label: "quotes" },
];
const photoLabels = ["photoHero", "photoMembership", "photoCorporate", "photoJourney1", "photoJourney2", "photoJourney3", "photoJourney4", "photoJourney5", "photoJourney6", "photoJourney7"] as const;
const blankAircraft = (orderIndex: number): AdminAircraft => ({
  id: "", name: "", descriptionMn: "", descriptionEn: "", seats: null,
  rangeKm: null, cruiseKmh: null, payloadKg: null, imageKey: null,
  focalX: 50, focalY: 50, altMn: "", altEn: "",
  specificationSource: "", specificationsVerified: false, orderIndex, isPublished: true,
});
const blankDestination = (orderIndex: number): AdminDestination => ({
  id: "", nameMn: "", nameEn: "", descriptionMn: "", descriptionEn: "",
  latitude: 47.92, longitude: 106.92, imageKey: null, coordinateSource: "",
  focalX: 50, focalY: 50, altMn: "", altEn: "",
  coordinatesVerified: false, orderIndex, isPublished: true,
});

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }
  if (!response.ok) {
    const message = isObject(body) && typeof body.error === "string" ? body.error : "The request failed.";
    throw new Error(message);
  }
  if (!isObject(body) || body.ok !== true) {
    const message = isObject(body) && typeof body.error === "string" ? body.error : "The request failed.";
    throw new Error(message);
  }
  return body as T;
}

function createSlug(name: string, prefix: string) {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function numberValue(value: string) {
  return value === "" ? null : Number(value);
}

function formatAmount(minor: number, currency: string, locale: string) {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-US", { style: "currency", currency })
    .format(minor / (10 ** digits));
}

export default function AdminDashboard({ email, role, logoutUrl, preview = false }: { email: string; role: AdminRole; logoutUrl: string; preview?: boolean }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  async function adminRequest<T>(url: string, init?: RequestInit): Promise<T> {
    if (!preview) return request<T>(url, init);
    if (init?.method && init.method !== "GET") throw new Error("Design preview: changes are disabled. Open the authenticated admin to save.");
    const section = url.split("?")[0].split("/").pop();
    const response = section === "content" ? { ok: true, values: { mn: {}, en: {} } }
      : section === "quotes" ? { ok: true, items: previewQuotes, revisions: [], history: [], aircraft: [], publishedPrices: [] }
      : section === "photos" ? { ok: true, items: defaultMediaSlots }
      : { ok: true, items: [] };
    return response as T;
  }
  const [tab, setTab] = useState<Tab>(role === "content_editor" ? "content" : "quotes");
  const [locale, setLocale] = useState<Locale>(preview ? "en" : "mn");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [viewPath, setViewPath] = useState("/mn");
  const [copy, setCopy] = useState<Record<Locale, Record<string, string | null>>>({ mn: {}, en: {} });
  const [savedCopy, setSavedCopy] = useState<Record<Locale, Record<string, string | null>>>({ mn: {}, en: {} });
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [photoForm, setPhotoForm] = useState<AdminPhoto | null>(null);
  const [revisionRefresh, setRevisionRefresh] = useState(0);
  const [prices, setPrices] = useState<AdminPrice[]>([]);
  const [priceForm, setPriceForm] = useState<PriceDraft | null>(null);
  const [priceDestinations, setPriceDestinations] = useState<AdminDestination[]>([]);
  const [aircraft, setAircraft] = useState<AdminAircraft[]>([]);
  const [destinations, setDestinations] = useState<AdminDestination[]>([]);
  const [quotes, setQuotes] = useState<AdminQuote[]>([]);
  const [revisions, setRevisions] = useState<QuoteRevision[]>([]);
  const [history, setHistory] = useState<QuoteHistory[]>([]);
  const [dispatchAircraft, setDispatchAircraft] = useState<DispatchAircraft[]>([]);
  const [publishedPrices, setPublishedPrices] = useState<QuotePriceSuggestion[]>([]);
  const [quoteFormId, setQuoteFormId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteCurrency, setQuoteCurrency] = useState("");
  const [quoteTerms, setQuoteTerms] = useState("");
  const [quoteExpiry, setQuoteExpiry] = useState("");
  const [confirmation, setConfirmation] = useState<Record<string, { aircraftId: string; note: string; approved: boolean }>>({});
  const [aircraftForm, setAircraftForm] = useState<AdminAircraft | null>(null);
  const [destinationForm, setDestinationForm] = useState<AdminDestination | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        if (tab === "content") {
          const response = await adminRequest<CopyResponse>("/api/admin/content");
          const next = { mn: { ...response.values.mn }, en: { ...response.values.en } };
          if (active) {
            setCopy(next);
            setSavedCopy({ mn: { ...next.mn }, en: { ...next.en } });
          }
        } else if (tab === "photos") {
          const response = await adminRequest<ItemsResponse<AdminPhoto>>("/api/admin/photos");
          if (active) setPhotos(response.items.length ? response.items : defaultMediaSlots);
        } else if (tab === "prices") {
          const [priceResponse, destinationResponse] = await Promise.all([
            adminRequest<ItemsResponse<AdminPrice>>("/api/admin/prices"),
            adminRequest<ItemsResponse<AdminDestination>>("/api/admin/destinations"),
          ]);
          if (active) {
            setPrices(priceResponse.items);
            setPriceDestinations(destinationResponse.items);
          }
        } else if (tab === "aircraft") {
          const response = await adminRequest<ItemsResponse<AdminAircraft>>("/api/admin/aircraft");
          if (active) setAircraft(response.items);
        } else if (tab === "destinations") {
          const response = await adminRequest<ItemsResponse<AdminDestination>>("/api/admin/destinations");
          if (active) setDestinations(response.items);
        } else {
          const response = await adminRequest<ItemsResponse<AdminQuote> & {
            revisions: QuoteRevision[];
            history: QuoteHistory[];
            aircraft: DispatchAircraft[];
            publishedPrices: QuotePriceSuggestion[];
          }>("/api/admin/quotes");
          if (active) {
            setQuotes(response.items);
            setRevisions(response.revisions);
            setHistory(response.history);
            setDispatchAircraft(response.aircraft);
            setPublishedPrices(response.publishedPrices);
          }
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load this section.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [tab, revisionRefresh]);

  const hasUnsavedCopy = (["mn", "en"] as const).some((language) =>
    [...new Set([...Object.keys(copy[language]), ...Object.keys(savedCopy[language])])].some(
      (key) => (copy[language][key] ?? null) !== (savedCopy[language][key] ?? null),
    ),
  );

  useEffect(() => {
    if (!hasUnsavedCopy) return;
    const protectChanges = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protectChanges);
    return () => window.removeEventListener("beforeunload", protectChanges);
  }, [hasUnsavedCopy]);

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      for (const language of ["mn", "en"] as const) {
        await adminRequest("/api/admin/content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: language, values: copy[language] }),
        });
      }
      setSavedCopy({ mn: { ...copy.mn }, en: { ...copy.en } });
      setNotice(adminText(locale, "saved"));
      setViewPath(`/${locale}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : adminText(locale, "failed"));
    } finally {
      setBusy(false);
    }
  }

  async function savePhoto(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (!photoForm) return;
      setBusy(true);
      setError("");
      setNotice("");
      try {
        await adminRequest("/api/admin/photos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: photoForm.key,
            imageKey: photoForm.imageKey,
            posterKey: photoForm.posterKey,
            focalX: photoForm.focalX,
            focalY: photoForm.focalY,
            altMn: photoForm.alt.mn,
            altEn: photoForm.alt.en,
            creditText: photoForm.creditText,
            creditUrl: photoForm.creditUrl,
          }),
        });
        const response = await adminRequest<ItemsResponse<AdminPhoto>>("/api/admin/photos");
        setPhotos(response.items);
        setPhotoForm(null);
        setNotice(adminText(locale, "saved"));
        setViewPath(`/${locale}`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : adminText(locale, "failed"));
      } finally {
        setBusy(false);
      }
  }

  function updatePhoto(value: { imageKey: string | null; posterKey: string | null; focalX: number; focalY: number; altMn: string; altEn: string }) {
      setPhotoForm((current) => {
        if (!current) return current;
        // A newly uploaded file replaces the old one, so the old file's credit no longer applies.
        const replaced = value.imageKey !== null && value.imageKey !== current.imageKey;
        return {
        ...current,
        imageKey: value.imageKey ?? current.imageKey,
        posterKey: value.imageKey ? value.posterKey : current.posterKey,
        creditText: replaced ? "" : current.creditText,
        creditUrl: replaced ? "" : current.creditUrl,
        focalX: value.focalX,
        focalY: value.focalY,
        alt: { mn: value.altMn, en: value.altEn },
        };
      });
  }

  async function restorePreviousPhoto(item: AdminPhoto) {
    if (!item.previousRevisionId || !window.confirm(adminText(locale, "restoreConfirm").replace("{name}", photoLabel(item.key)))) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminRequest("/api/admin/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", entityType: "photo", entityId: item.key, revisionId: item.previousRevisionId }),
      });
      const response = await adminRequest<ItemsResponse<AdminPhoto>>("/api/admin/photos");
      setPhotos(response.items);
      setPhotoForm(null);
      setNotice(adminText(locale, "saved"));
      setViewPath(`/${locale}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : adminText(locale, "failed"));
    } finally {
      setBusy(false);
    }
  }

  async function savePrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!priceForm) return;
    const id = priceForm.id || `${createSlug(priceForm.labelEn, "price")}-${crypto.randomUUID().slice(0, 6)}`;
    const amount = priceForm.amount.trim();
    const old = prices.find((item) => item.id === priceForm.id);
    const oldText = old ? formatAmount(old.amountMinor, old.currency, locale) : "—";
    const currency = priceForm.currency.toUpperCase();
    const nextNumber = Number(amount);
    let nextMinor = Number.NaN;
    try {
      const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
      nextMinor = Math.round(nextNumber * (10 ** digits));
    } catch {
      setError(adminText(locale, "invalidCurrencyCode"));
      return;
    }
    const nextText = Number.isSafeInteger(nextMinor)
      ? formatAmount(nextMinor, currency, locale)
      : amount;
    const prompt = locale === "mn"
      ? `${adminText(locale, "priceWas")}: ${oldText}\n${adminText(locale, "priceNow")}: ${nextText}\n${adminText(locale, "confirmPrice")}`
      : `${adminText(locale, "priceWas")}: ${oldText}\n${adminText(locale, "priceNow")}: ${nextText}\n${adminText(locale, "confirmPrice")}`;
    if (!window.confirm(prompt)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminRequest("/api/admin/prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...priceForm, id, amount, currency }),
      });
      const response = await adminRequest<ItemsResponse<AdminPrice>>("/api/admin/prices");
      setPrices(response.items);
      setPriceForm(null);
      setNotice(adminText(locale, "saved"));
      setViewPath(priceForm.destinationId ? `/${locale}/destinations` : `/${locale}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : adminText(locale, "failed"));
    } finally {
      setBusy(false);
    }
  }

  function createPriceDraft(item?: AdminPrice): PriceDraft {
    return item
      ? { ...item, amount: String(minorToMajor(item.amountMinor, item.currency)) }
      : {
        id: "", kind: "route", labelMn: "", labelEn: "", noteMn: "", noteEn: "",
        amount: "", currency: "MNT", unit: "per_flight", destinationId: null,
        aircraftId: null, isPublished: false, orderIndex: prices.length,
      };
  }

  async function movePrice(item: AdminPrice, direction: -1 | 1) {
    const ordered = [...prices].sort((a, b) => a.orderIndex - b.orderIndex);
    const index = ordered.findIndex((price) => price.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const swapped = [...ordered];
    [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
    setBusy(true);
    try {
      await adminRequest("/api/admin/prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          items: swapped.map((price, orderIndex) => ({ id: price.id, orderIndex })),
        }),
      });
      const response = await adminRequest<ItemsResponse<AdminPrice>>("/api/admin/prices");
      setPrices(response.items);
      setNotice(adminText(locale, "saved"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : adminText(locale, "failed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveAircraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!aircraftForm) return;
    const item = {
      ...aircraftForm,
      id: aircraftForm.id || `${createSlug(aircraftForm.name, "aircraft")}-${crypto.randomUUID().slice(0, 6)}`,
      altMn: aircraftForm.altMn || aircraftForm.name,
      altEn: aircraftForm.altEn || aircraftForm.name,
    };
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminRequest("/api/admin/aircraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const response = await adminRequest<ItemsResponse<AdminAircraft>>("/api/admin/aircraft");
      setAircraft(response.items);
      setAircraftForm(null);
      setNotice(adminText(locale, "saved"));
      setViewPath(`/${locale}/fleet`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : adminText(locale, "failed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveDestination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!destinationForm) return;
    const item = {
      ...destinationForm,
      id: destinationForm.id || `${createSlug(destinationForm.nameEn, "destination")}-${crypto.randomUUID().slice(0, 6)}`,
      altMn: destinationForm.altMn || destinationForm.nameMn,
      altEn: destinationForm.altEn || destinationForm.nameEn,
    };
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminRequest("/api/admin/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const response = await adminRequest<ItemsResponse<AdminDestination>>("/api/admin/destinations");
      setDestinations(response.items);
      setDestinationForm(null);
      setNotice(adminText(locale, "saved"));
      setViewPath(`/${locale}/destinations`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : adminText(locale, "failed"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(kind: "aircraft" | "destinations", id: string, name: string, permanent = false) {
    const confirmText = permanent
      ? adminConfirm(locale, "permanentConfirm", name)
      : adminConfirm(locale, "hideConfirm", name);
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminRequest(`/api/admin/${kind}?id=${encodeURIComponent(id)}${permanent ? "&permanent=true" : ""}`, { method: "DELETE" });
      if (kind === "aircraft") {
        const response = await adminRequest<ItemsResponse<AdminAircraft>>("/api/admin/aircraft");
        setAircraft(response.items);
      } else {
        const response = await adminRequest<ItemsResponse<AdminDestination>>("/api/admin/destinations");
        setDestinations(response.items);
      }
      setNotice(adminText(locale, permanent ? "permanentDelete" : "hide"));
      setViewPath(`/${locale}${kind === "aircraft" ? "/fleet" : "/destinations"}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this item.");
    } finally {
      setBusy(false);
    }
  }

  async function quoteAction(body: Record<string, unknown>) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await adminRequest<{ status?: string; notificationPending?: boolean }>("/api/admin/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const response = await adminRequest<ItemsResponse<AdminQuote> & {
        revisions: QuoteRevision[];
        history: QuoteHistory[];
        aircraft: DispatchAircraft[];
        publishedPrices: QuotePriceSuggestion[];
      }>("/api/admin/quotes");
      setQuotes(response.items);
      setRevisions(response.revisions);
      setHistory(response.history);
      setDispatchAircraft(response.aircraft);
      setPublishedPrices(response.publishedPrices);
      if (result.notificationPending) {
        setError(adminText(locale, "notificationWarning"));
      } else {
        setNotice(adminText(locale, "flightStatusSaved"));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : adminText(locale, "failed"));
    } finally {
      setBusy(false);
    }
  }

  async function issueQuote(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await adminRequest<{ revision: number }>("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          amount: quoteAmount,
          currency: quoteCurrency.toUpperCase(),
          terms: quoteTerms,
          expiresAt: new Date(quoteExpiry).toISOString(),
        }),
      });
      setQuoteFormId("");
      setQuoteAmount("");
      setQuoteCurrency("");
      setQuoteTerms("");
      setQuoteExpiry("");
      setNotice(adminText(locale, "quoteSent").replace("{revision}", String(result.revision)));
      const response = await adminRequest<ItemsResponse<AdminQuote> & {
        revisions: QuoteRevision[];
        history: QuoteHistory[];
        aircraft: DispatchAircraft[];
        publishedPrices: QuotePriceSuggestion[];
      }>("/api/admin/quotes");
      setQuotes(response.items);
      setRevisions(response.revisions);
      setHistory(response.history);
      setDispatchAircraft(response.aircraft);
      setPublishedPrices(response.publishedPrices);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : adminText(locale, "failed"));
    } finally {
      setBusy(false);
    }
  }

  function matchingPrice(item: AdminQuote): QuotePriceSuggestion | undefined {
      const destination = item.destination.trim().toLocaleLowerCase();
      return publishedPrices.find((price) => price.destination_id !== null && (
        price.destination_mn?.trim().toLocaleLowerCase() === destination ||
        price.destination_en?.trim().toLocaleLowerCase() === destination ||
        price.label_mn.trim().toLocaleLowerCase() === destination ||
        price.label_en.trim().toLocaleLowerCase() === destination
      ));
  }

  function startQuote(item: AdminQuote) {
      const suggestion = matchingPrice(item);
      setQuoteFormId(quoteFormId === item.id ? "" : item.id);
      if (quoteFormId === item.id) return;
      if (!suggestion) {
        setQuoteAmount("");
        setQuoteCurrency("");
        return;
      }
      const digits = new Intl.NumberFormat("en", { style: "currency", currency: suggestion.currency })
        .resolvedOptions().maximumFractionDigits ?? 2;
      setQuoteAmount(minorToMajor(suggestion.amount_minor, suggestion.currency).toFixed(digits));
      setQuoteCurrency(suggestion.currency);
  }

  const tabs = allTabs.filter((item) =>
    role === "owner" ||
    (role === "dispatcher" && item.id === "quotes") ||
    (role === "content_editor" && item.id !== "quotes"),
  );
  const orderedPhotos = [...photos].sort((left, right) =>
    defaultMediaSlots.findIndex((item) => item.key === left.key) -
    defaultMediaSlots.findIndex((item) => item.key === right.key),
  );
  const photoLabel = (key: string) => {
    const index = defaultMediaSlots.findIndex((item) => item.key === key);
    return adminText(locale, photoLabels[index] ?? "photos");
  };

  const matchesQuery = (value: string) => value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const visibleQuotes = quotes.filter((item) => (statusFilter === "all" || item.status === statusFilter) && matchesQuery([item.name, item.id, item.email, item.phone, item.origin, item.destination, item.organization].join(" ")));
  const visibleFields = cmsFields.filter((field) => matchesQuery([field.label, field.key, cmsFieldText(locale, field.key, field.label), cmsSectionText(locale, field.group)].join(" ")));
  const tabDescriptions: Record<Tab, string> = locale === "mn" ? {
    quotes: "Нислэгийн хүсэлт, үнийн санал, баталгаажуулалт.", content: "Вэбсайтын Монгол, Англи текстийг нэг дор засах.",
    photos: "Вэбсайтын зураг болон харагдах хэсгийг удирдах.", prices: "Дотоод үнийн мэдээлэл. Нийтийн вэбсайтад үнэ харуулахгүй.", aircraft: "Нисдэг тэрэгний мэдээлэл, зураг, нийтлэлт.", destinations: "Чиглэл, зураг, байршлын мэдээлэл.",
  } : {
    quotes: "Every journey starts here. Review requests and manage proposals.", content: "Your website, in your words. Edit Mongolian and English together.",
    photos: "Curate the imagery that tells your story.", prices: "Internal price references. Public catalogue pricing is currently withheld.", aircraft: "Aircraft details, photography and publication controls.", destinations: "The places you fly. Manage imagery and destination details.",
  };
  return (
    <div className="admin-shell admin-workspace">
      <header className="admin-top">
        <a className="brand" href={`/${locale}`}><span className="brand-mark" aria-hidden="true"><i /></span><span>Ajet<small>{adminText(locale, "admin")}</small></span></a>
        <div className="admin-user">
          <span>{email}</span>
        <label className="admin-language"><span className="sr-only">{adminText(locale, "language")}</span><select aria-label={adminText(locale, "language")} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}><option value="mn">МН</option><option value="en">EN</option></select></label>
        {role === "owner" && <a href="/admin/careers">{locale === "mn" ? "Хүний нөөц" : "Recruitment"}</a>}
        <a href={logoutUrl}>{adminText(locale, "logout")}</a>
        </div>
      </header>
      <aside className="admin-side">
        <p className="admin-side-label">{locale === "mn" ? "АЖЛЫН ТАЛБАР" : "WORKSPACE"}</p>
        <nav aria-label={adminText(locale, "admin")}>
          {[...tabs].sort((a, b) => (a.id === "quotes" ? -1 : b.id === "quotes" ? 1 : 0)).map((item) => <button type="button" key={item.id} aria-current={tab === item.id ? "page" : undefined} onClick={() => {
            if (tab === "content" && hasUnsavedCopy && !window.confirm(adminText(locale, "contentUnsaved"))) return;
            setTab(item.id); setQuery(""); setStatusFilter("all"); setNotice("");
          }}><span className="admin-nav-icon" aria-hidden="true">{({ quotes: "↗", content: "Aa", photos: "▧", prices: "₮", aircraft: "✧", destinations: "◎" })[item.id]}</span>{adminText(locale, item.label)}<span className="admin-nav-arrow" aria-hidden="true">›</span></button>)}
        </nav>
        <div className="admin-side-bottom"><span className="live-dot" />{adminText(locale, role)}<p>AJET · {locale === "mn" ? "Удирдлагын систем" : "Website & operations"}</p><a href={`/${locale}`} target="_blank" rel="noreferrer">{adminText(locale, "viewHome")} ↗</a></div>
      </aside>
      <main className="admin-main">
        <div className="admin-heading">
          <div><p className="eyebrow">AJET · {adminText(locale, role)}</p><h1>{adminText(locale, tab)}</h1><p>{tabDescriptions[tab]}</p></div>
          <a href={`/${locale}`} target="_blank" rel="noreferrer" className="btn ghost">{adminText(locale, "viewHome")} ↗</a>
        </div>
        {preview && <p className="admin-preview-banner">{locale === "mn" ? "ЗАГВАРЫН УРЬДЧИЛСАН ХАРАХ · Жишээ өгөгдөл. Өөрчлөлт хадгалагдахгүй." : "DESIGN PREVIEW · Illustrative data. Changes are disabled; no live records are connected."}</p>}
        <div className="admin-toolbar">
          <label className="admin-search"><span aria-hidden="true">⌕</span><span className="sr-only">{locale === "mn" ? "Хайх" : "Search"}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "mn" ? "Энэ хэсэгт хайх…" : "Search this section…"} /></label>
          <button type="button" className="admin-refresh" disabled={loading || busy || hasUnsavedCopy} onClick={() => setRevisionRefresh((value) => value + 1)}>↻ {locale === "mn" ? "Шинэчлэх" : "Refresh"}</button>
        </div>
        {error && <p className="admin-alert error" role="alert">{error}</p>}
        {notice && <p className="admin-alert success" role="status">{notice} <a href={viewPath} target="_blank" rel="noreferrer">{adminText(locale, "view")} ↗</a></p>}
        {loading ? <div className="admin-empty">{adminText(locale, "loading")}</div> : <>
          {tab === "content" && (
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div><h2>{adminText(locale, "content")}</h2><p>{adminText(locale, "contentIntro")}</p></div>
              </div>
              <form className="admin-form" onSubmit={saveContent}>
                {[...new Set(visibleFields.map((field) => field.group))].map((group) => <details className="admin-copy-group" key={group} open={query.length > 0 || group === "Hero"}>
                  <summary>{cmsSectionText(locale, group)}<span>{visibleFields.filter((field) => field.group === group).length}</span></summary>
                  <div className="cms-field-list">{visibleFields.filter((field) => field.group === group).map((field) => <fieldset className="cms-field-pair" key={field.key}>
                    <legend>{cmsFieldText(locale, field.key, field.label)}</legend>
                    {(["mn", "en"] as const).map((language) => <label key={language}>{adminText(locale, language === "mn" ? "mongolian" : "english")}
                      {field.multiline
                        ? <textarea rows={3} value={copy[language][field.key] ?? ""} placeholder={defaultCopyValue(t(language), field.key)} onChange={(event) => setCopy((current) => ({ ...current, [language]: { ...current[language], [field.key]: event.target.value } }))} />
                        : <input type={field.key === "contactEmail" ? "email" : "text"} value={copy[language][field.key] ?? ""} placeholder={defaultCopyValue(t(language), field.key)} onChange={(event) => setCopy((current) => ({ ...current, [language]: { ...current[language], [field.key]: event.target.value } }))} />}
                      <button type="button" className="admin-link cms-reset" onClick={() => setCopy((current) => ({ ...current, [language]: { ...current[language], [field.key]: null } }))}>{adminText(locale, "contentReset")}</button>
                    </label>)}
                    <AdminHistory entityType="copy" entityId={`mn:${field.key}`} locale={locale} onRestored={() => setRevisionRefresh((value) => value + 1)} />
                    <AdminHistory entityType="copy" entityId={`en:${field.key}`} locale={locale} onRestored={() => setRevisionRefresh((value) => value + 1)} />
                  </fieldset>)}</div>
                </details>)}
                <div className="admin-save-bar">
                  {hasUnsavedCopy && <span role="status">{adminText(locale, "contentUnsaved")}</span>}
                  <button className="btn admin-submit" type="submit" disabled={busy || !hasUnsavedCopy}>{busy ? adminText(locale, "saving") : adminText(locale, "save")}</button>
                </div>
              </form>
            </section>
          )}
          {tab === "photos" && (
            <section className="admin-panel">
              <div className="admin-panel-heading"><div><h2>{adminText(locale, "photos")}</h2><p>{adminText(locale, "photoIntro")}</p></div></div>
              {locale === "mn" && <p className="admin-review-note">{adminText(locale, "languageReview")}</p>}
              <div className="photo-slot-grid">{orderedPhotos.filter((item) => matchesQuery(photoLabel(item.key))).map((item) => (
                <button className="photo-slot-card" type="button" key={item.key} onClick={() => setPhotoForm(item)}>
                  <span className="photo-slot-thumb"><img src={mediaUrl(slotStill(item))} alt={item.alt[locale]} style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }} /></span>
                  <strong>{photoLabel(item.key)}</strong>
                  <span>{adminText(locale, "aspectLandscape")}</span>
                </button>
              ))}</div>
              {photoForm && <form className="admin-form admin-editor photo-editor" onSubmit={savePhoto}>
                <h3>{photoLabel(photoForm.key)}</h3>
                <AdminHistory entityType="photo" entityId={photoForm.key} locale={locale} onRestored={() => setRevisionRefresh((value) => value + 1)} />
                <ImagePicker
                  locale={locale}
                  imageKey={photoForm.imageKey}
                  posterKey={photoForm.posterKey}
                  focalX={photoForm.focalX}
                  focalY={photoForm.focalY}
                  altMn={photoForm.alt.mn}
                  altEn={photoForm.alt.en}
                  allowVideo
                  wide
                  aspectRatio={photoForm.key === "hero" || photoForm.key.startsWith("journey") ? 16 / 9 : 4 / 3}
                  onChange={updatePhoto}
                />
                <p className="image-picker-help">{adminText(locale, photoForm.key === "hero" || photoForm.key.startsWith("journey") ? "aspectLandscape" : "aspectPortrait")}</p>
                <div className="admin-two">
                  <label>{adminText(locale, "creditText")}<input maxLength={200} value={photoForm.creditText} onChange={(event) => setPhotoForm({ ...photoForm, creditText: event.target.value })} /></label>
                  <label>{adminText(locale, "creditUrl")}<input type="url" pattern="https://.*" maxLength={500} value={photoForm.creditUrl} onChange={(event) => setPhotoForm({ ...photoForm, creditUrl: event.target.value })} /></label>
                </div>
                <p className="image-picker-help">{adminText(locale, "creditHelp")}</p>
                {photoForm.previousRevisionId && <button type="button" className="admin-link" disabled={busy} onClick={() => void restorePreviousPhoto(photoForm)}>{adminText(locale, "restorePrevious")}</button>}
                <div className="admin-form-actions admin-save-bar"><button type="submit" className="btn" disabled={busy}>{busy ? adminText(locale, "saving") : adminText(locale, "save")}</button><button type="button" className="admin-link" onClick={() => setPhotoForm(null)}>{adminText(locale, "cancel")}</button></div>
              </form>}
            </section>
          )}
          {tab === "prices" && (
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div><h2>{adminText(locale, "prices")}</h2><p>{adminText(locale, "priceIntro")}</p></div>
                <button className="btn sm" type="button" onClick={() => setPriceForm(createPriceDraft())}>{adminText(locale, "addPrice")}</button>
              </div>
              {prices.length === 0 && <p className="admin-empty">{adminText(locale, "noPrices")}</p>}
              <div className="admin-card-list">{prices.map((item, index) => ({ item, index })).filter(({ item }) => matchesQuery(`${item.labelMn} ${item.labelEn}`)).map(({ item, index }) => <article className="admin-item" key={item.id}>
                <div>
                  <span className={`admin-state${item.isPublished ? " published" : ""}`}>{adminText(locale, item.isPublished ? "published" : "hidden")}</span>
                  <h3>{locale === "mn" ? item.labelMn : item.labelEn}</h3>
                  <p>{formatAmount(item.amountMinor, item.currency, locale)} · {adminText(locale, item.unit)}</p>
                </div>
                <div className="admin-item-actions">
                  <button type="button" className="admin-link" aria-label={adminText(locale, "moveUp")} disabled={busy || index === 0} onClick={() => void movePrice(item, -1)}>↑</button>
                  <button type="button" className="admin-link" aria-label={adminText(locale, "moveDown")} disabled={busy || index === prices.length - 1} onClick={() => void movePrice(item, 1)}>↓</button>
                  <button type="button" className="admin-link" onClick={() => setPriceForm(createPriceDraft(item))}>{adminText(locale, "edit")}</button>
                  <AdminHistory entityType="price" entityId={item.id} locale={locale} onRestored={() => setRevisionRefresh((value) => value + 1)} />
                </div>
              </article>)}</div>
              {priceForm && <form className="admin-form admin-editor" onSubmit={savePrice}>
                <h3>{adminText(locale, priceForm.id ? "editPrice" : "newPrice")}</h3>
                <div className="admin-two">
                  <label>{adminText(locale, "labelMn")}<input required maxLength={120} value={priceForm.labelMn} onChange={(event) => setPriceForm({ ...priceForm, labelMn: event.target.value })} /></label>
                  <label>{adminText(locale, "labelEn")}<input required maxLength={120} value={priceForm.labelEn} onChange={(event) => setPriceForm({ ...priceForm, labelEn: event.target.value })} /></label>
                  <label>{adminText(locale, "noteMn")}<textarea maxLength={500} rows={2} value={priceForm.noteMn} onChange={(event) => setPriceForm({ ...priceForm, noteMn: event.target.value })} /></label>
                  <label>{adminText(locale, "noteEn")}<textarea maxLength={500} rows={2} value={priceForm.noteEn} onChange={(event) => setPriceForm({ ...priceForm, noteEn: event.target.value })} /></label>
                </div>
                <label>{adminText(locale, "priceType")}
                  <select value={priceForm.kind} onChange={(event) => setPriceForm({ ...priceForm, kind: event.target.value as AdminPrice["kind"] })}>
                    <option value="route">{adminText(locale, "route")}</option><option value="hourly">{adminText(locale, "hourly")}</option>
                    <option value="membership">{adminText(locale, "membershipKind")}</option><option value="other">{adminText(locale, "other")}</option>
                  </select>
                </label>
                <label>{adminText(locale, "linkDestination")}
                  <select value={priceForm.destinationId ?? ""} onChange={(event) => setPriceForm({ ...priceForm, destinationId: event.target.value || null })}>
                    <option value="">{adminText(locale, "notLinked")}</option>
                    {priceDestinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.nameMn} · {destination.nameEn}</option>)}
                  </select>
                </label>
                <div className="admin-two">
                  <label>{adminText(locale, "amount")}<input required inputMode="decimal" pattern="[0-9]+([.][0-9]{1,4})?" value={priceForm.amount} onChange={(event) => setPriceForm({ ...priceForm, amount: event.target.value })} /></label>
                  <label>{adminText(locale, "currency")}<input required maxLength={3} pattern="[A-Za-z]{3}" value={priceForm.currency} onChange={(event) => setPriceForm({ ...priceForm, currency: event.target.value.toUpperCase() })} /></label>
                  <label>{adminText(locale, "unit")}<select value={priceForm.unit} onChange={(event) => setPriceForm({ ...priceForm, unit: event.target.value as AdminPrice["unit"] })}>
                    <option value="per_flight">{adminText(locale, "per_flight")}</option><option value="per_hour">{adminText(locale, "per_hour")}</option><option value="per_package">{adminText(locale, "per_package")}</option>
                  </select></label>
                </div>
                <label className="admin-check"><input type="checkbox" checked={priceForm.isPublished} onChange={(event) => setPriceForm({ ...priceForm, isPublished: event.target.checked })} />{adminText(locale, "showPrice")}</label>
                <div className="admin-form-actions admin-save-bar"><button type="submit" className="btn" disabled={busy}>{busy ? adminText(locale, "saving") : adminText(locale, "save")}</button><button type="button" className="admin-link" onClick={() => setPriceForm(null)}>{adminText(locale, "cancel")}</button></div>
              </form>}
            </section>
          )}
          {tab === "aircraft" && (
            <section className="admin-panel">
              <div className="admin-panel-heading"><div><h2>{adminText(locale, "aircraft")}</h2><p>{adminText(locale, "manageFleet")}</p></div>
                <button className="btn sm" type="button" onClick={() => setAircraftForm(blankAircraft(aircraft.length))}>{adminText(locale, "addAircraft")}</button>
              </div>
              <div className="admin-card-list">{aircraft.filter((item) => matchesQuery(item.name)).map((item) => <article className="admin-item" key={item.id}>
                <div><span className={`admin-state${item.isPublished ? " published" : ""}`}>{adminText(locale, item.isPublished ? "published" : "hidden")}</span> <span className={`admin-state${item.specificationsVerified ? " published" : ""}`}>{item.specificationsVerified ? adminText(locale, "checkedSpecifications") : adminText(locale, "specificationsPending")}</span><h3>{item.name}</h3><p>{item.seats ? `${item.seats} ${adminText(locale, "aircraftSeats")}` : adminText(locale, "noSeating")}</p><small>{adminText(locale, "specificationsHelp")}</small></div>
                <div className="admin-item-actions"><button type="button" className="admin-link" onClick={() => setAircraftForm(item)}>{adminText(locale, "edit")}</button><button type="button" className="admin-link danger" disabled={busy} onClick={() => void deleteItem("aircraft", item.id, item.name)}>{adminText(locale, "hide")}</button>{role === "owner" && <button type="button" className="admin-link danger" disabled={busy} onClick={() => void deleteItem("aircraft", item.id, item.name, true)}>{adminText(locale, "permanentDelete")}</button>}<AdminHistory entityType="aircraft" entityId={item.id} locale={locale} onRestored={() => setRevisionRefresh((value) => value + 1)} /></div>
              </article>)}</div>
              {aircraftForm && <form className="admin-form admin-editor" onSubmit={saveAircraft}>
                <h3>{adminText(locale, aircraftForm.id ? "editAircraft" : "newAircraft")}</h3>
                <label>{adminText(locale, "name")}<input required minLength={2} maxLength={100} value={aircraftForm.name} onChange={(e) => setAircraftForm({ ...aircraftForm, name: e.target.value })} /></label>
                <div className="admin-two">
                  <label>{adminText(locale, "description")} · {adminText(locale, "mongolian")}<textarea rows={3} value={aircraftForm.descriptionMn} onChange={(e) => setAircraftForm({ ...aircraftForm, descriptionMn: e.target.value })} /></label>
                  <label>{adminText(locale, "description")} · {adminText(locale, "english")}<textarea rows={3} value={aircraftForm.descriptionEn} onChange={(e) => setAircraftForm({ ...aircraftForm, descriptionEn: e.target.value })} /></label>
                </div>
                <div className="admin-four">
                  {([
                    ["seats", "seats"], ["rangeKm", "range"], ["cruiseKmh", "cruise"], ["payloadKg", "payload"],
                  ] as const).map(([key, label]) => <label key={key}>{adminText(locale, label)}<input type="number" min="1" value={aircraftForm[key] ?? ""} onChange={(e) => setAircraftForm({ ...aircraftForm, [key]: numberValue(e.target.value) })} /></label>)}
                </div>
                <label className="concierge-full">{adminText(locale, "specificationSource")}
                  <input type="url" maxLength={500} value={aircraftForm.specificationSource} onChange={(e) => setAircraftForm({ ...aircraftForm, specificationSource: e.target.value })} />
                </label>
                <p className="admin-help">{adminText(locale, "specificationsHelp")}</p>
                <label className="admin-check"><input type="checkbox" checked={aircraftForm.specificationsVerified} onChange={(e) => setAircraftForm({ ...aircraftForm, specificationsVerified: e.target.checked })} /> {adminText(locale, "checkedSpecifications")}</label>
                <label>{adminText(locale, "displayOrder")}<input type="number" min="0" max="10000" value={aircraftForm.orderIndex} onChange={(e) => setAircraftForm({ ...aircraftForm, orderIndex: Number(e.target.value) })} /></label>
                <label className="concierge-full">{adminText(locale, "aircraftPhoto")}
                  <ImagePicker locale={locale} imageKey={aircraftForm.imageKey} focalX={aircraftForm.focalX} focalY={aircraftForm.focalY} altMn={aircraftForm.altMn || aircraftForm.name} altEn={aircraftForm.altEn || aircraftForm.name} aspectRatio={4 / 3}
                    onChange={(value) => setAircraftForm({ ...aircraftForm, imageKey: value.imageKey, focalX: value.focalX, focalY: value.focalY, altMn: value.altMn, altEn: value.altEn })} />
                </label>
                <label className="admin-check"><input type="checkbox" checked={aircraftForm.isPublished} onChange={(e) => setAircraftForm({ ...aircraftForm, isPublished: e.target.checked })} /> {adminText(locale, "publishedOnSite")}</label>
                <div className="admin-form-actions admin-save-bar"><button type="submit" className="btn" disabled={busy}>{busy ? adminText(locale, "saving") : adminText(locale, "save")}</button><button type="button" className="admin-link" onClick={() => setAircraftForm(null)}>{adminText(locale, "cancel")}</button></div>
              </form>}
            </section>
          )}
          {tab === "destinations" && (
            <section className="admin-panel">
              <div className="admin-panel-heading"><div><h2>{adminText(locale, "destinations")}</h2><p>{adminText(locale, "manageDestinations")}</p></div>
                <button className="btn sm" type="button" onClick={() => setDestinationForm(blankDestination(destinations.length))}>{adminText(locale, "addDestination")}</button>
              </div>
              <div className="admin-card-list">{destinations.filter((item) => matchesQuery(`${item.nameMn} ${item.nameEn}`)).map((item) => <article className="admin-item" key={item.id}>
                <div><span className={`admin-state${item.isPublished ? " published" : ""}`}>{adminText(locale, item.isPublished ? "published" : "hidden")}</span> <span className={`admin-state${item.coordinatesVerified ? " published" : ""}`}>{adminText(locale, item.coordinatesVerified ? "checkedCoordinates" : "coordinatesPending")}</span><h3>{item.nameMn} <small>· {item.nameEn}</small></h3><p>{adminText(locale, "coordinateHelp")}</p></div>
                <div className="admin-item-actions"><button type="button" className="admin-link" onClick={() => setDestinationForm(item)}>{adminText(locale, "edit")}</button><button type="button" className="admin-link danger" disabled={busy} onClick={() => void deleteItem("destinations", item.id, item.nameMn)}>{adminText(locale, "hide")}</button>{role === "owner" && <button type="button" className="admin-link danger" disabled={busy} onClick={() => void deleteItem("destinations", item.id, item.nameMn, true)}>{adminText(locale, "permanentDelete")}</button>}<AdminHistory entityType="destination" entityId={item.id} locale={locale} onRestored={() => setRevisionRefresh((value) => value + 1)} /></div>
              </article>)}</div>
              {destinationForm && <form className="admin-form admin-editor" onSubmit={saveDestination}>
                <h3>{adminText(locale, destinationForm.id ? "editDestination" : "newDestination")}</h3>
                <div className="admin-two">
                  <label>{adminText(locale, "name")} · {adminText(locale, "mongolian")}<input required value={destinationForm.nameMn} onChange={(e) => setDestinationForm({ ...destinationForm, nameMn: e.target.value })} /></label>
                  <label>{adminText(locale, "name")} · {adminText(locale, "english")}<input required value={destinationForm.nameEn} onChange={(e) => setDestinationForm({ ...destinationForm, nameEn: e.target.value })} /></label>
                  <label>{adminText(locale, "description")} · {adminText(locale, "mongolian")}<textarea rows={3} value={destinationForm.descriptionMn} onChange={(e) => setDestinationForm({ ...destinationForm, descriptionMn: e.target.value })} /></label>
                  <label>{adminText(locale, "description")} · {adminText(locale, "english")}<textarea rows={3} value={destinationForm.descriptionEn} onChange={(e) => setDestinationForm({ ...destinationForm, descriptionEn: e.target.value })} /></label>
                </div>
                <div className="admin-two">
                  <label>{adminText(locale, "latitude")}<input type="number" step="any" min="-90" max="90" required value={destinationForm.latitude} onChange={(e) => setDestinationForm({ ...destinationForm, latitude: Number(e.target.value) })} /></label>
                  <label>{adminText(locale, "longitude")}<input type="number" step="any" min="-180" max="180" required value={destinationForm.longitude} onChange={(e) => setDestinationForm({ ...destinationForm, longitude: Number(e.target.value) })} /></label>
                </div>
                <label className="concierge-full">{adminText(locale, "coordinateSourceLabel")}
                  <input type="url" maxLength={500} value={destinationForm.coordinateSource} onChange={(e) => setDestinationForm({ ...destinationForm, coordinateSource: e.target.value })} />
                </label>
                <p className="admin-help">{adminText(locale, "coordinateHelp")}</p>
                <label className="admin-check"><input type="checkbox" checked={destinationForm.coordinatesVerified} onChange={(e) => setDestinationForm({ ...destinationForm, coordinatesVerified: e.target.checked })} /> {adminText(locale, "checkedCoordinates")}</label>
                <label>{adminText(locale, "displayOrder")}<input type="number" min="0" max="10000" value={destinationForm.orderIndex} onChange={(e) => setDestinationForm({ ...destinationForm, orderIndex: Number(e.target.value) })} /></label>
                <label className="concierge-full">{adminText(locale, "destinationPhoto")}
                  <ImagePicker locale={locale} imageKey={destinationForm.imageKey} focalX={destinationForm.focalX} focalY={destinationForm.focalY} altMn={destinationForm.altMn || destinationForm.nameMn} altEn={destinationForm.altEn || destinationForm.nameEn} aspectRatio={4 / 3}
                    onChange={(value) => setDestinationForm({ ...destinationForm, imageKey: value.imageKey, focalX: value.focalX, focalY: value.focalY, altMn: value.altMn, altEn: value.altEn })} />
                </label>
                <label className="admin-check"><input type="checkbox" checked={destinationForm.isPublished} onChange={(e) => setDestinationForm({ ...destinationForm, isPublished: e.target.checked })} /> {adminText(locale, "publishedOnSite")}</label>
                <div className="admin-form-actions admin-save-bar"><button type="submit" className="btn" disabled={busy}>{busy ? adminText(locale, "saving") : adminText(locale, "save")}</button><button type="button" className="admin-link" onClick={() => setDestinationForm(null)}>{adminText(locale, "cancel")}</button></div>
              </form>}
            </section>
          )}
          {tab === "quotes" && (
            <section className="admin-panel">
              <div className="admin-panel-heading"><div><h2>{adminText(locale, "quotes")}</h2><p>{adminText(locale, "manageRequests")}</p></div><span className="admin-count">{quotes.length} {adminText(locale, "recentRequests")}</span></div>
              <div className="request-summary">{[
                ["requested", locale === "mn" ? "Шинэ хүсэлт" : "New requests"],
                ["in_review", locale === "mn" ? "Хянаж байна" : "In review"],
                ["quoted", locale === "mn" ? "Санал илгээсэн" : "Proposals sent"],
                ["approved", locale === "mn" ? "Зөвшөөрсөн" : "Client approved"],
              ].map(([status, label]) => <button type="button" key={status} aria-pressed={statusFilter === status} onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}><span>{label}</span><strong>{quotes.filter((item) => item.status === status).length.toString().padStart(2, "0")}</strong><span className="summary-arrow" aria-hidden="true">↗</span></button>)}</div>
              <div className="request-filters" role="group" aria-label={locale === "mn" ? "Төлөвөөр шүүх" : "Filter by status"}>{["all", "requested", "in_review", "quoted", "approved", "confirmed", "declined", "expired", "closed"].map((status) => <button type="button" key={status} aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)}>{status === "all" ? (locale === "mn" ? "Бүгд" : "All requests") : adminStatusText(locale, status)}</button>)}</div>
              {visibleQuotes.length === 0 ? <div className="admin-empty">{query || statusFilter !== "all" ? (locale === "mn" ? "Тохирох хүсэлт олдсонгүй. Хайлтаа өөрчилнө үү." : "No matching requests. Try another search or status.") : adminText(locale, "noRequests")}</div> : <div className="admin-table-wrap"><table className="admin-table">
                <thead><tr><th>{adminText(locale, "request")}</th><th>{adminText(locale, "routeAndDate")}</th><th>{adminText(locale, "contact")}</th><th>{adminText(locale, "passengers")}</th><th>{adminText(locale, "workflow")}</th></tr></thead>
                <tbody>{visibleQuotes.map((item) => {
                  const quoteRevisions = revisions.filter((revision) => revision.quote_id === item.id);
                  const quoteHistory = history.filter((entry) => entry.quote_id === item.id);
                  const confirm = confirmation[item.id] ?? { aircraftId: "", note: "", approved: false };
                  return (
                    <Fragment key={item.id}>
                      <tr>
                        <td><strong>{item.name}</strong><small>{item.created_at}</small>{item.notes && <p>{item.notes}</p>}</td>
                        <td>{item.origin} → {item.destination}<small>{item.flight_date}{item.flight_time && ` · ${item.flight_time}`}{item.round_trip ? ` · ${adminText(locale, "return")}` : ""}</small></td>
                        <td>{item.name}<small><a href={`tel:${item.phone}`}>{item.phone}</a></small>{item.email && <small><a href={`mailto:${item.email}`}>{item.email}</a></small>}</td>
                        <td><small>{serviceName(locale, item.service ?? "charter")}</small>{item.passengers}<small>{item.service === "charter" || !item.service ? (locale === "mn" ? "зорчигч" : "passengers") : (locale === "mn" ? "зочин / оролцогч" : "guests / participants")}</small></td>
                        <td>
                          <strong className={`request-status status-${item.status}`}>{adminStatusText(locale, item.status)}</strong>
                          {item.status === "requested" && <button type="button" className="admin-link" disabled={busy} onClick={() => void quoteAction({ action: "review", id: item.id })}>{adminText(locale, "startReview")}</button>}
                          {(item.status === "in_review" || item.status === "quoted") && (
                            <button type="button" className="admin-link" onClick={() => startQuote(item)}>
                              {item.status === "quoted" ? adminText(locale, "issueRevision") : adminText(locale, "prepareQuote")}
                            </button>
                          )}
                          {item.status === "approved" && (
                            <div className="admin-workflow-actions">
                              {(!item.service || item.service === "charter") && <label>{adminText(locale, "assignAircraft")}
                                <select value={confirm.aircraftId} onChange={(event) => setConfirmation((current) => ({ ...current, [item.id]: { ...confirm, aircraftId: event.target.value } }))}>
                                  <option value="">{adminText(locale, "selectVerifiedAircraft")}</option>
                                  {dispatchAircraft.filter((aircraftItem) => aircraftItem.seats !== null && aircraftItem.seats >= item.passengers).map((aircraftItem) =>
                                    <option value={aircraftItem.id} key={aircraftItem.id}>{aircraftItem.name} · {aircraftItem.seats} {adminText(locale, "seatsUnit")}</option>)}
                                </select>
                              </label>
                              }
                              <label>{adminText(locale, "operationalNote")}
                                <textarea required minLength={10} maxLength={500} value={confirm.note} onChange={(event) => setConfirmation((current) => ({ ...current, [item.id]: { ...confirm, note: event.target.value } }))} />
                              </label>
                              <label className="admin-check"><input type="checkbox" checked={confirm.approved} onChange={(event) => setConfirmation((current) => ({ ...current, [item.id]: { ...confirm, approved: event.target.checked } }))} />
                                {!item.service || item.service === "charter" ? adminText(locale, "clientApproved") : (locale === "mn" ? "Үйлчилгээний хүрээ, багийн боломжийг баталгаажууллаа." : "Service scope and team availability are confirmed.")}
                              </label>
                              <button type="button" className="btn sm" disabled={busy || ((!item.service || item.service === "charter") && !confirm.aircraftId) || !confirm.approved || confirm.note.trim().length < 10} onClick={() => void quoteAction({ action: "confirm", id: item.id, aircraftId: (!item.service || item.service === "charter") ? confirm.aircraftId : undefined, operationalApproval: true, note: confirm.note })}>{!item.service || item.service === "charter" ? adminText(locale, "confirmFlight") : (locale === "mn" ? "Үйлчилгээ баталгаажуулах" : "Confirm service")}</button>
                            </div>
                          )}
                          {item.status === "confirmed" && <small>{adminText(locale, "operationallyApproved")} {item.operational_approved_by ?? adminText(locale, "dispatcher")}{item.assigned_aircraft_id ? ` · ${dispatchAircraft.find((entry) => entry.id === item.assigned_aircraft_id)?.name ?? ""}` : ""}</small>}
                          {!["confirmed", "closed", "declined", "expired"].includes(item.status) && <button type="button" className="admin-link danger" disabled={busy} onClick={() => void quoteAction({ action: "close", id: item.id, note: adminText(locale, "closedBy") })}>{adminText(locale, "closeRequest")}</button>}
                        </td>
                      </tr>
                      {(quoteFormId === item.id || quoteRevisions.length > 0 || quoteHistory.length > 0) && (
                        <tr className="admin-workflow-row"><td colSpan={5}>
                          {quoteFormId === item.id && (
                            <form className="admin-form admin-workflow-form" onSubmit={(event) => void issueQuote(event, item.id)}>
                              <h3>{adminText(locale, "quoteFor")}</h3>
                              <p>{adminText(locale, "quoteDeliveryHelp")}</p>
                              {matchingPrice(item) && <p className="price-suggestion">
                                {adminText(locale, "quoteSuggestion")
                                  .replace("{label}", locale === "mn" ? matchingPrice(item)!.label_mn : matchingPrice(item)!.label_en)
                                  .replace("{amount}", formatAmount(matchingPrice(item)!.amount_minor, matchingPrice(item)!.currency, item.locale))}
                              </p>}
                              <div className="admin-two">
                                <label>{adminText(locale, "amount")}<input required inputMode="decimal" pattern="[0-9]+([.][0-9]{1,4})?" value={quoteAmount} onChange={(event) => setQuoteAmount(event.target.value)} /></label>
                                <label>{adminText(locale, "currencyCode")}<input required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={quoteCurrency} onChange={(event) => setQuoteCurrency(event.target.value.toUpperCase())} /></label>
                                <label>{adminText(locale, "expires")}<input required type="datetime-local" value={quoteExpiry} onChange={(event) => setQuoteExpiry(event.target.value)} /></label>
                                <label>{adminText(locale, "terms")}<textarea required minLength={4} maxLength={3000} rows={3} value={quoteTerms} onChange={(event) => setQuoteTerms(event.target.value)} /></label>
                              </div>
                              <div className="admin-form-actions admin-save-bar"><button className="btn" type="submit" disabled={busy || !item.email}>{busy ? adminText(locale, "sending") : adminText(locale, "sendQuote")}</button><button type="button" className="admin-link" onClick={() => setQuoteFormId("")}>{adminText(locale, "cancel")}</button></div>
                              {!item.email && <p className="admin-alert error">{adminText(locale, "clientEmailRequired")}</p>}
                            </form>
                          )}
                          {quoteRevisions.length > 0 && <details className="admin-workflow-details">
                            <summary>{adminText(locale, "quoteRevisions")} ({quoteRevisions.length})</summary>
                            <ol>{quoteRevisions.map((revision) => <li key={revision.id}>
                              <strong>Revision {revision.revision} · {formatAmount(revision.amount_minor, revision.currency, item.locale)}</strong>
                              <span>{adminStatusText(locale, revision.status)} · {adminText(locale, "expires")} {revision.expires_at}</span>
                              <p>{revision.terms}</p>
                            </li>)}</ol>
                          </details>}
                          {quoteHistory.length > 0 && <details className="admin-workflow-details">
                            <summary>{adminText(locale, "statusHistory")} ({quoteHistory.length})</summary>
                            <ol>{quoteHistory.map((entry) => <li key={entry.id}>
                              <strong>{adminStatusText(locale, entry.from_status ?? "received")} → {adminStatusText(locale, entry.to_status)}</strong>
                              <span>{entry.actor} · {entry.created_at}</span>
                              {entry.note && <p>{entry.note}</p>}
                            </li>)}</ol>
                          </details>}
                        </td></tr>
                      )}
                    </Fragment>
                  );
                })}</tbody>
              </table></div>}
            </section>
          )}
        </>}
      </main>
    </div>
  );
}
