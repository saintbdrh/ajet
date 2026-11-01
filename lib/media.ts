// Media types, limits, and URL helpers shared by server code and the admin UI (no server-only imports here).

export type Localized = { mn: string; en: string };
export type MediaKind = "image" | "video";

export const MEDIA_TYPES: Record<string, { extension: string; kind: MediaKind; maxBytes: number }> = {
  "image/jpeg": { extension: "jpg", kind: "image", maxBytes: 10 * 1024 * 1024 },
  "image/png": { extension: "png", kind: "image", maxBytes: 10 * 1024 * 1024 },
  "image/webp": { extension: "webp", kind: "image", maxBytes: 10 * 1024 * 1024 },
  "video/mp4": { extension: "mp4", kind: "video", maxBytes: 50 * 1024 * 1024 },
  "video/webm": { extension: "webm", kind: "video", maxBytes: 50 * 1024 * 1024 },
};
export const MAX_VIDEO_SECONDS = 60;

/** Uploaded object keys look like uploads/<uuid>.<ext>; built-in fallbacks are /img/<file> in public/. */
export const UPLOAD_KEY_PATTERN = /^uploads\/[a-f0-9-]{36}\.(jpg|png|webp|mp4|webm)$/;
export const STATIC_IMAGE_PATTERN = /^\/img\/[a-zA-Z0-9._-]+$/;

export function isVideoKey(key: string | null | undefined): boolean {
  return Boolean(key && /\.(mp4|webm)$/.test(key));
}

export function mediaUrl(key: string): string {
  if (key.startsWith("/img/")) return key;
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/${key}` : `/media/${key}`;
}

/** Checks the first bytes of a file against its declared type. */
export function matchesSignature(contentType: string, bytes: Uint8Array): boolean {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  switch (contentType) {
    case "image/jpeg": return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png": return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
    case "image/webp": return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "video/mp4": return ascii(4, 8) === "ftyp";
    case "video/webm": return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    default: return false;
  }
}

export type MediaSlot = {
  key: string;
  /** Image or video key. For a video, posterKey holds the still image shown before playback. */
  imageKey: string;
  posterKey: string | null;
  focalX: number;
  focalY: number;
  alt: Localized;
  creditText: string;
  creditUrl: string;
};

const heroCredit = {
  creditText: "Vyacheslav Argenberg · CC BY 4.0",
  creditUrl: "https://commons.wikimedia.org/wiki/File:Tengboche,_Helicopter_in_flight,_Mountains_of_Nepal.jpg",
};
const noCredit = { creditText: "", creditUrl: "" };

export const defaultMediaSlots: MediaSlot[] = [
  { key: "hero", imageKey: "/img/hero.jpg", posterKey: null, focalX: 50, focalY: 50, alt: { mn: "Нисдэг тэрэг уулын дээгүүр нисэж байна", en: "A helicopter flying above the mountains" }, ...heroCredit },
  { key: "membership", imageKey: "/img/lake.jpg", posterKey: null, focalX: 50, focalY: 50, alt: { mn: "Уулсын дундах нуур", en: "A remote mountain lake" }, ...noCredit },
  { key: "corporate", imageKey: "/img/mountains.jpg", posterKey: null, focalX: 50, focalY: 50, alt: { mn: "Уулсын оргил", en: "Mountain peaks" }, ...noCredit },
  { key: "journey-01", imageKey: "/img/lake.jpg", posterKey: null, focalX: 50, focalY: 52, alt: { mn: "Уулсын дундах нуур", en: "A remote mountain lake" }, ...noCredit },
  { key: "journey-02", imageKey: "/img/hero.jpg", posterKey: null, focalX: 58, focalY: 50, alt: { mn: "Нисдэг тэрэгний бүхээг", en: "A helicopter in flight" }, ...heroCredit },
  { key: "journey-03", imageKey: "/img/hero.jpg", posterKey: null, focalX: 65, focalY: 50, alt: { mn: "Нисдэг тэрэг уулын дээгүүр нисэж байна", en: "A helicopter flying above the mountains" }, ...heroCredit },
  { key: "journey-04", imageKey: "/img/mountains.jpg", posterKey: null, focalX: 50, focalY: 48, alt: { mn: "Уулсын оргил", en: "Mountain peaks" }, ...noCredit },
  { key: "journey-05", imageKey: "/img/lake.jpg", posterKey: null, focalX: 50, focalY: 44, alt: { mn: "Уулсын дундах нуур", en: "A remote mountain lake" }, ...noCredit },
  { key: "journey-06", imageKey: "/img/mountains.jpg", posterKey: null, focalX: 50, focalY: 57, alt: { mn: "Уулсын дээгүүрх нислэг", en: "A flight above mountain peaks" }, ...noCredit },
  { key: "journey-07", imageKey: "/img/hero.jpg", posterKey: null, focalX: 50, focalY: 54, alt: { mn: "Нисдэг тэрэг уулын дээгүүр нисэж байна", en: "A helicopter flying above the mountains" }, ...heroCredit },
];

/** A still image for places that cannot play video (cards, fallbacks): the poster for videos, the image otherwise. */
export function slotStill(slot: Pick<MediaSlot, "imageKey" | "posterKey">): string {
  return isVideoKey(slot.imageKey) && slot.posterKey ? slot.posterKey : slot.imageKey;
}
