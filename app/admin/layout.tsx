import type { ReactNode } from "react";
import "../globals.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ "--font-serif": "Georgia,serif", "--font-sans": "system-ui,sans-serif" } as React.CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
