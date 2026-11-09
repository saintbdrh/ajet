import type { ReactNode } from "react";
import "../globals.css";
import "../premium.css";
import "../admin-workspace.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/cyrillic-400.css";
import "@fontsource/manrope/cyrillic-600.css";
import "../dashboard.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ "--font-serif": "Georgia,serif", "--font-sans": "system-ui,sans-serif" } as React.CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
