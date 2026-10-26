import { NextResponse } from "next/server";
import { authorizeAdmin, type AdminRole } from "@/lib/admin";

export async function requireAdmin(
  request: Request,
  allowedRoles: AdminRole[] = [],
): Promise<NextResponse | { email: string; role: AdminRole }> {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())) {
    const origin = request.headers.get("origin");
    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(request.url).origin;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
    }
    if (!origin || origin !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ ok: false, error: "Cross-origin admin requests are not allowed." }, { status: 403 });
    }
  }
  const authorization = await authorizeAdmin(request.headers);
  if ("email" in authorization) {
    if (
      authorization.role === "owner" ||
      allowedRoles.length === 0 ||
      allowedRoles.includes(authorization.role)
    ) return authorization;
    return NextResponse.json({ ok: false, error: "This admin role cannot perform this action." }, { status: 403 });
  }
  return NextResponse.json(
    { ok: false, error: authorization.error },
    { status: authorization.status },
  );
}

export function isAdminResponse(value: NextResponse | { email: string; role: AdminRole }): value is NextResponse {
  return value instanceof NextResponse;
}
