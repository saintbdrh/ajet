"use client";

import { useState } from "react";
import { adminText } from "@/lib/admin-dictionary";
import type { Locale } from "@/lib/i18n";

type Props = {
  entityType: "copy" | "photo" | "price" | "aircraft" | "destination";
  entityId: string;
  locale: Locale;
  onRestored: () => void;
};

type Revision = { id: number; actor: string; createdAt: string; summary: string };

export default function AdminHistory({ entityType, entityId, locale, onRestored }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Revision[]>([]);

  async function loadHistory() {
    setOpen((value) => !value);
    if (open || items.length) return;
    setBusy(true);
    try {
      const query = new URLSearchParams({ type: entityType, id: entityId, locale });
      const response = await fetch(`/api/admin/history?${query}`);
      const body = await response.json() as { ok: boolean; items?: Revision[]; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? adminText(locale, "failed"));
      setItems(body.items ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : adminText(locale, "failed"));
    } finally {
      setBusy(false);
    }
  }

  async function restore(id: number) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", entityType, entityId, revisionId: id }),
      });
      const body = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? adminText(locale, "failed"));
      setItems([]);
      setOpen(false);
      onRestored();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : adminText(locale, "failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-history">
      <button type="button" className="admin-link" aria-expanded={open} onClick={() => void loadHistory()}>
        {adminText(locale, "history")}
      </button>
      {open && <div className="admin-history-list">
        {busy && <p role="status">{adminText(locale, "loading")}</p>}
        {error && <p className="admin-alert error" role="alert">{error}</p>}
        {!busy && !error && items.length === 0 && <p>{adminText(locale, "noHistory")}</p>}
        {items.map((item) => <article key={item.id}>
          <strong>{item.summary}</strong>
          <span>{item.actor} · {item.createdAt}</span>
          <button type="button" className="admin-link" disabled={busy} onClick={() => void restore(item.id)}>{adminText(locale, "restore")}</button>
        </article>)}
      </div>}
    </div>
  );
}
