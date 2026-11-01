import type { Database } from "@/lib/db";
import { STATIC_IMAGE_PATTERN, type MediaKind } from "@/lib/media";

/** Kind of a media key that may be saved into content: a built-in /img/ file or a finished upload. Null if not usable. */
export async function usableMediaKind(db: Database, key: string): Promise<MediaKind | null> {
  if (STATIC_IMAGE_PATTERN.test(key)) return "image";
  const asset = await db.prepare(
    "SELECT kind FROM media_assets WHERE key = ? AND status = 'ready'",
  ).bind(key).first<{ kind: MediaKind }>();
  return asset?.kind ?? null;
}
