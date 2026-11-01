import { notFound } from "next/navigation";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";
export default function AdminDesignPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <AdminDashboard email="design-preview@example.com" role="owner" logoutUrl="/mn" preview />;
}
