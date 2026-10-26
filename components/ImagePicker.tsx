"use client";

import { useEffect, useRef, useState } from "react";
import { adminText } from "@/lib/admin-dictionary";
import type { Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  imageKey: string | null;
  focalX: number;
  focalY: number;
  altMn: string;
  altEn: string;
  onChange: (value: { imageKey: string | null; focalX: number; focalY: number; altMn: string; altEn: string }) => void;
  wide?: boolean;
  aspectRatio?: number;
};

async function optimizedImage(file: File): Promise<{ file: File; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("imageProcessingUnavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error("preparePhotoFailed");
  return {
    file: new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" }),
    width: canvas.width,
    height: canvas.height,
  };
}

export default function ImagePicker({ locale, imageKey, focalX, focalY, altMn, altEn, onChange, wide = false, aspectRatio = 16 / 9 }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [small, setSmall] = useState(false);
  const [wrongOrientation, setWrongOrientation] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function choose(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(adminText(locale, "uploadTypeError"));
      return;
    }
    try {
      const optimized = await optimizedImage(file);
      const ready = optimized.file;
      setSmall(Math.min(optimized.width, optimized.height) < 700);
      setWrongOrientation(Math.abs((optimized.width / optimized.height) / aspectRatio - 1) > 0.3);
      const localUrl = URL.createObjectURL(ready);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(localUrl);
      setBusy(true);
      const form = new FormData();
      form.set("file", ready);
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const data = await response.json() as { ok: boolean; key?: string; error?: string };
      if (!response.ok || !data.ok || !data.key) throw new Error(data.error ?? adminText(locale, "uploadFailed"));
      onChange({ imageKey: data.key, focalX, focalY, altMn, altEn });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setError(message === "imageProcessingUnavailable"
        ? adminText(locale, "imageProcessingUnavailable")
        : message === "preparePhotoFailed"
          ? adminText(locale, "preparePhotoFailed")
          : adminText(locale, "uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  const src = previewUrl || (imageKey ? imageKey.startsWith("/img/") ? imageKey : `/media/${imageKey}` : "");
  return (
    <div className="image-picker">
      <button type="button" className={`image-picker-preview${wide ? " wide" : ""}`} onPointerUp={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
        onChange({ imageKey, focalX: Math.max(0, Math.min(100, x)), focalY: Math.max(0, Math.min(100, y)), altMn, altEn });
      }} onKeyDown={(event) => {
        const step = event.shiftKey ? 10 : 1;
        let nextX = focalX;
        let nextY = focalY;
        if (event.key === "ArrowLeft") nextX = Math.max(0, focalX - step);
        else if (event.key === "ArrowRight") nextX = Math.min(100, focalX + step);
        else if (event.key === "ArrowUp") nextY = Math.max(0, focalY - step);
        else if (event.key === "ArrowDown") nextY = Math.min(100, focalY + step);
        else return;
        event.preventDefault();
        onChange({ imageKey, focalX: nextX, focalY: nextY, altMn, altEn });
      }} aria-label={adminText(locale, "focalHelp")}>
        {src ? <img src={src} alt="" style={{ objectPosition: `${focalX}% ${focalY}%` }} /> : <span>{adminText(locale, "choosePhoto")}</span>}
        <i style={{ left: `${focalX}%`, top: `${focalY}%` }} aria-hidden="true" />
      </button>
      <p className="image-picker-help">{adminText(locale, "focalHelp")}</p>
      {small && <p className="image-picker-warning" role="status">{adminText(locale, "photoQualityWarning")}</p>}
      {wrongOrientation && <p className="image-picker-warning" role="status">{adminText(locale, "photoOrientationWarning")}</p>}
      <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void choose(event.currentTarget.files?.[0])} />
      <button type="button" className="btn ghost image-picker-button" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? adminText(locale, "saving") : imageKey ? adminText(locale, "changePhoto") : adminText(locale, "choosePhoto")}
      </button>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      <div className="admin-two image-picker-alt">
        <label>{adminText(locale, "altMn")}<input required maxLength={300} value={altMn} onChange={(event) => onChange({ imageKey, focalX, focalY, altMn: event.target.value, altEn })} /></label>
        <label>{adminText(locale, "altEn")}<input required maxLength={300} value={altEn} onChange={(event) => onChange({ imageKey, focalX, focalY, altMn, altEn: event.target.value })} /></label>
      </div>
    </div>
  );
}
