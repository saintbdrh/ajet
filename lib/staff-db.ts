import type { AdminRole } from "@/lib/admin";
import type { Database } from "@/lib/db";

type StaffAuthorization = { email: string; role: AdminRole };

export async function withStaffDatabase<T>(
  db: Database,
  authorization: StaffAuthorization,
  run: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.prepare("SELECT set_config('app.staff_role', ?, true), set_config('app.actor_email', ?, true)")
      .bind(authorization.role, authorization.email).run();
    return run(tx);
  });
}
