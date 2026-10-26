import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import { getCloudflareEnv } from "@/lib/cloudflare";

export type AdminRole = "owner" | "dispatcher" | "content_editor";

type AdminAuthorization =
  | { email: string; role: AdminRole }
  | { status: 401 | 403 | 503; error: string };

const jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function authorizeAdmin(headers: Headers): Promise<AdminAuthorization> {
  const env = await getCloudflareEnv();
  if (!env) return { status: 503, error: "Cloudflare Access is not configured." };

  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const audience = env.CF_ACCESS_AUD?.trim();
  const allowedEmails = (env.ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const roles = new Map<string, AdminRole>();
  for (const entry of (env.ADMIN_ROLE_MAPPINGS ?? "").split(",")) {
    const [rawEmail, rawRole, ...extra] = entry.split(":");
    const email = rawEmail?.trim().toLowerCase();
    const role = rawRole?.trim();
    if (!email && !role) continue;
    if (!email || extra.length > 0 || !["owner", "dispatcher", "content_editor"].includes(role ?? "")) {
      return { status: 503, error: "Cloudflare Access admin role mappings are invalid." };
    }
    roles.set(email, role as AdminRole);
  }
  if (!teamDomain || !audience || allowedEmails.length === 0 || roles.size === 0) {
    return { status: 503, error: "Cloudflare Access admin settings or role mappings are incomplete." };
  }

  const token = headers.get("cf-access-jwt-assertion");
  if (!token) return { status: 401, error: "Authentication required." };

  const issuer = `https://${teamDomain}`;
  let jwks = jwksByIssuer.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    jwksByIssuer.set(issuer, jwks);
  }

  try {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    if (!email || !allowedEmails.includes(email)) {
      return { status: 401, error: "This account is not allowed to use the admin." };
    }
    const role = roles.get(email);
    if (!role) return { status: 401, error: "This account has no assigned admin role." };
    return { email, role };
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      return { status: 401, error: "Authentication required." };
    }
    console.error("[admin] Cloudflare Access verification is unavailable.", error);
    return { status: 503, error: "Authentication is temporarily unavailable." };
  }
}
