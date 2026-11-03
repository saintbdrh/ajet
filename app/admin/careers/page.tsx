import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { authorizeAdmin } from "@/lib/admin";
import { getDatabase } from "@/lib/db";
import { experienceCopy } from "@/lib/experiences";

export const dynamic = "force-dynamic";
export default async function Recruitment() {
  const auth = await authorizeAdmin(await headers());
  if ("status" in auth || auth.role !== "owner") notFound();
  const db = await getDatabase();
  const rows = db ? (await db.prepare("SELECT id, full_name, email, phone, area, experience, created_at FROM career_interests ORDER BY created_at DESC, id LIMIT 100").all<{ id: string; full_name: string; email: string; phone: string; area: number; experience: string; created_at: string }>()).results : [];
  return <main className="wrap sec"><Link className="textlink" href="/admin">← Staff workspace</Link><h1>Recruitment interest</h1><p>Latest 100 registrations · owner access only</p><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}><thead><tr>{["Name", "Contact", "Area", "Experience", "Received"].map((h) => <th key={h} style={{ padding: "1rem" }}>{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td style={{ padding: "1rem", verticalAlign: "top" }}>{row.full_name}</td><td style={{ padding: "1rem", verticalAlign: "top" }}>{row.email}<br />{row.phone}</td><td style={{ padding: "1rem", verticalAlign: "top" }}>{experienceCopy.en.areas[row.area]}</td><td style={{ padding: "1rem", maxWidth: "40ch", whiteSpace: "pre-wrap" }}>{row.experience}</td><td style={{ padding: "1rem", verticalAlign: "top" }}>{row.created_at}</td></tr>)}</tbody></table></div>{!rows.length && <p>No registrations yet.</p>}</main>;
}
