import type { Database } from "@/lib/db";
export function contentRevisionStatement(
  db: Database,
  entityType: "copy" | "photo" | "price" | "aircraft" | "destination",
  entityId: string,
  before: unknown,
  after: unknown,
  actor: string,
) {
  return db.prepare(
    "INSERT INTO content_revisions (entity_type, entity_id, snapshot_json, actor) VALUES (?, ?, ?, ?)",
  ).bind(entityType, entityId, JSON.stringify({ before, after }), actor);
}
