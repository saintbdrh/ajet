import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AdminDashboard from "@/components/AdminDashboard";
import { authorizeAdmin } from "@/lib/admin";
import { adminText } from "@/lib/admin-dictionary";
import { getCloudflareEnv } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authorization = await authorizeAdmin(await headers());
  if ("status" in authorization) {
    if (authorization.status === 401) notFound();
    return (
      <main className="admin-gate">
        <div className="admin-gate-card">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <p className="eyebrow">AJET · {adminText("mn", "admin")}</p>
          <h1>{adminText("mn", "accessNotReady")}</h1>
          <a href="/mn" className="textlink">{adminText("mn", "returnToSite")}</a>
        </div>
      </main>
    );
  }

  const env = await getCloudflareEnv();
  const teamDomain = env?.CF_ACCESS_TEAM_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!teamDomain) notFound();
  return (
    <AdminDashboard
      email={authorization.email}
      role={authorization.role}
      logoutUrl={`https://${teamDomain}/cdn-cgi/access/logout`}
    />
  );
}
