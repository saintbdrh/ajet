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
export const STATIC_IMAGE_PATTERN = /^\/img\/(?:(?:brand|ajet)\/)?[a-zA-Z0-9._-]+$/;

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

const heroCredit = { creditText: "", creditUrl: "" };
const noCredit = { creditText: "", creditUrl: "" };

export const defaultMediaSlots: MediaSlot[] = [
  { key: "hero", imageKey: "/img/brand/window-view.webp", posterKey: null, focalX: 50, focalY: 50, alt: { mn: "Агаарын хөлгийн цонхоор харагдах тэнгэр", en: "The sky through an aircraft window" }, ...heroCredit },
  { key: "membership", imageKey: "/img/brand/window-view.webp", posterKey: null, focalX: 50, focalY: 50, alt: { mn: "Агаарын хөлгийн цонхоор харагдах тэнгэр", en: "The sky through an aircraft window" }, ...noCredit },
  { key: "corporate", imageKey: "/img/ajet/ec145-cabin.webp", posterKey: null, focalX: 50, focalY: 50, alt: { mn: "A-JET EC145-ийн бодит зорчигчийн бүхээг", en: "Actual A-JET EC145 passenger cabin" }, ...noCredit },
  { key: "journey-01", imageKey: "/img/ajet/ec145-rooftop.webp", posterKey: null, focalX: 50, focalY: 52, alt: { mn: "Дээврийн талбайд зогссон A-JET EC145", en: "A-JET EC145 parked on a rooftop helipad" }, ...noCredit },
  { key: "journey-02", imageKey: "/img/ajet/studio-detail.webp", posterKey: null, focalX: 58, focalY: 50, alt: { mn: "A-JET EC145 нисдэг тэрэгний студийн дүрслэл", en: "Studio rendering of the A-JET EC145 helicopter" }, ...heroCredit },
  { key: "journey-03", imageKey: "/img/ajet/ec145-cabin.webp", posterKey: null, focalX: 65, focalY: 50, alt: { mn: "A-JET EC145-ийн бодит зорчигчийн бүхээг", en: "Actual A-JET EC145 passenger cabin" }, ...heroCredit },
  { key: "journey-04", imageKey: "/img/brand/mountain-view.webp", posterKey: null, focalX: 50, focalY: 48, alt: { mn: "Уулсын оргил", en: "Mountain peaks" }, ...noCredit },
  { key: "journey-05", imageKey: "/img/brand/window-view.webp", posterKey: null, focalX: 50, focalY: 44, alt: { mn: "Агаарын хөлгийн цонхоор харагдах тэнгэр", en: "The sky through an aircraft window" }, ...noCredit },
  { key: "journey-06", imageKey: "/img/brand/mountain-view.webp", posterKey: null, focalX: 50, focalY: 57, alt: { mn: "Уулсын дээгүүрх нислэг", en: "A flight above mountain peaks" }, ...noCredit },
  { key: "journey-07", imageKey: "/img/brand/window-view.webp", posterKey: null, focalX: 50, focalY: 54, alt: { mn: "Агаарын хөлгийн цонхоор харагдах тэнгэр", en: "The sky through an aircraft window" }, ...heroCredit },
];

/** A still image for places that cannot play video (cards, fallbacks): the poster for videos, the image otherwise. */
export function slotStill(slot: Pick<MediaSlot, "imageKey" | "posterKey">): string {
  return isVideoKey(slot.imageKey) && slot.posterKey ? slot.posterKey : slot.imageKey;
}
