import { getCloudflareContext } from "@opennextjs/cloudflare";

const isBuild = process.env.NEXT_PHASE === "phase-production-build";

export async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env;
  } catch (error) {
    if (process.env.NODE_ENV === "development" || isBuild) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[cloudflare] Worker bindings are unavailable; using local preview data.",
          error instanceof Error ? error.message : error,
        );
      }
      return null;
    }
    throw error;
  }
}

export async function getDatabase(): Promise<D1Database | null> {
  const env = await getCloudflareEnv();
  if (env?.DB) return env.DB;
  if (process.env.NODE_ENV !== "production" || isBuild) return null;
  throw new Error("Cloudflare D1 binding DB is not configured.");
}
