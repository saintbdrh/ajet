"use client";

import { useEffect, useRef, useState } from "react";
import { adminText } from "@/lib/admin-dictionary";
import type { Locale } from "@/lib/i18n";
import { MAX_VIDEO_SECONDS, MEDIA_TYPES, isVideoKey, mediaUrl } from "@/lib/media";

type Value = { imageKey: string | null; posterKey: string | null; focalX: number; focalY: number; altMn: string; altEn: string };
type Props = Omit<Value, "posterKey"> & {
  locale: Locale;
  posterKey?: string | null;
  onChange: (value: Value) => void;
  /** Accept MP4/WebM videos as well as images (photo slots only). */
  allowVideo?: boolean;
  wide?: boolean;
  aspectRatio?: number;
};
type Meta = { width: number | null; height: number | null; durationMs: number | null };

const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const videoTypes = ["video/mp4", "video/webm"];

async function canvasToWebp(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error("preparePhotoFailed");
  return new File([blob], `${name}.webp`, { type: "image/webp" });
}

function scaledCanvas(width: number, height: number, maxSide: number) {
  const ratio = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("imageProcessingUnavailable");
  return { canvas, context };
}

async function optimizedImage(file: File): Promise<{ file: File; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { canvas, context } = scaledCanvas(bitmap.width, bitmap.height, 2400);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { file: await canvasToWebp(canvas, file.name.replace(/\.[^.]+$/, "")), width: canvas.width, height: canvas.height };
}

/** Reads a video's size and duration, and captures a frame as a WebP poster. */
async function inspectVideo(file: File): Promise<{ poster: File; width: number; height: number; durationMs: number }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("videoUnreadable"));
      video.src = url;
    });
    const durationMs = Math.round(video.duration * 1000);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = Math.min(1, video.duration / 2);
    });
    const { canvas, context } = scaledCanvas(video.videoWidth, video.videoHeight, 1920);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const poster = await canvasToWebp(canvas, `${file.name.replace(/\.[^.]+$/, "")}-poster`);
    return { poster, width: video.videoWidth, height: video.videoHeight, durationMs };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function postMedia<T>(body: unknown): Promise<T> {
  const response = await fetch("/api/admin/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json() as { ok: boolean; error?: string } & T;
  if (!response.ok || !data.ok) throw new Error(data.error ?? "uploadFailed");
  return data;
}

/** Uploads straight to object storage with a presigned URL, then asks the server to verify the stored file. */
async function uploadFile(file: File, meta: Meta): Promise<string> {
  const started = await postMedia<{ id: string; uploadUrl: string; uploadHeaders: Record<string, string> }>({
    action: "start", contentType: file.type, size: file.size, ...meta,
  });
  const put = await fetch(started.uploadUrl, { method: "PUT", headers: started.uploadHeaders, body: file });
  if (!put.ok) throw new Error("uploadFailed");
  const completed = await postMedia<{ key: string }>({ action: "complete", id: started.id });
  return completed.key;
}

export default function ImagePicker({
  locale, imageKey, posterKey = null, focalX, focalY, altMn, altEn, onChange, allowVideo = false, wide = false, aspectRatio = 16 / 9,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; video: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [small, setSmall] = useState(false);
  const [wrongOrientation, setWrongOrientation] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const value = { imageKey, posterKey, focalX, focalY, altMn, altEn };

  function showPreview(file: File, video: boolean, width: number, height: number) {
    setSmall(Math.min(width, height) < 700);
    setWrongOrientation(Math.abs((width / height) / aspectRatio - 1) > 0.3);
    setPreview({ url: URL.createObjectURL(file), video });
  }

  async function choose(file?: File) {
    if (!file) return;
    setError("");
    const isVideo = allowVideo && videoTypes.includes(file.type);
    if (!isVideo && !imageTypes.includes(file.type)) {
      setError(adminText(locale, allowVideo ? "uploadTypeErrorVideo" : "uploadTypeError"));
      return;
    }
    if (isVideo && file.size > MEDIA_TYPES[file.type].maxBytes) {
      setError(adminText(locale, "videoTooLarge"));
      return;
    }
    setBusy(true);
    try {
      if (isVideo) {
        const video = await inspectVideo(file);
        if (video.durationMs > MAX_VIDEO_SECONDS * 1000) {
          setError(adminText(locale, "videoTooLong"));
          return;
        }
        showPreview(file, true, video.width, video.height);
        const [videoKey, newPosterKey] = await Promise.all([
          uploadFile(file, { width: video.width, height: video.height, durationMs: video.durationMs }),
          uploadFile(video.poster, { width: null, height: null, durationMs: null }),
        ]);
        onChange({ ...value, imageKey: videoKey, posterKey: newPosterKey });
      } else {
        const optimized = await optimizedImage(file);
        showPreview(optimized.file, false, optimized.width, optimized.height);
        const key = await uploadFile(optimized.file, { width: optimized.width, height: optimized.height, durationMs: null });
        onChange({ ...value, imageKey: key, posterKey: null });
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setError(message === "imageProcessingUnavailable" || message === "preparePhotoFailed" || message === "videoUnreadable"
        ? adminText(locale, message)
        : adminText(locale, "uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  const showingVideo = preview ? preview.video : isVideoKey(imageKey);
  const src = preview?.url ?? (imageKey ? mediaUrl(imageKey) : "");
  const poster = !preview && posterKey ? mediaUrl(posterKey) : undefined;
  return (
    <div className="image-picker">
      <button type="button" className={`image-picker-preview${wide ? " wide" : ""}`} onPointerUp={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
        onChange({ ...value, focalX: Math.max(0, Math.min(100, x)), focalY: Math.max(0, Math.min(100, y)) });
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
        onChange({ ...value, focalX: nextX, focalY: nextY });
      }} aria-label={adminText(locale, "focalHelp")}>
        {src
          ? showingVideo
            ? <video src={src} poster={poster} muted loop autoPlay playsInline style={{ objectPosition: `${focalX}% ${focalY}%` }} />
            : <img src={src} alt="" style={{ objectPosition: `${focalX}% ${focalY}%` }} />
          : <span>{adminText(locale, allowVideo ? "chooseMedia" : "choosePhoto")}</span>}
        <i style={{ left: `${focalX}%`, top: `${focalY}%` }} aria-hidden="true" />
      </button>
      <p className="image-picker-help">{adminText(locale, "focalHelp")}</p>
      {allowVideo && <p className="image-picker-help">{adminText(locale, "videoHelp")}</p>}
      {small && <p className="image-picker-warning" role="status">{adminText(locale, "photoQualityWarning")}</p>}
      {wrongOrientation && <p className="image-picker-warning" role="status">{adminText(locale, "photoOrientationWarning")}</p>}
      <input ref={input} hidden type="file" accept={[...imageTypes, ...(allowVideo ? videoTypes : [])].join(",")} onChange={(event) => void choose(event.currentTarget.files?.[0])} />
      <button type="button" className="btn ghost image-picker-button" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? adminText(locale, "uploading") : imageKey ? adminText(locale, allowVideo ? "changeMedia" : "changePhoto") : adminText(locale, allowVideo ? "chooseMedia" : "choosePhoto")}
      </button>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      <div className="admin-two image-picker-alt">
        <label>{adminText(locale, "altMn")}<input required maxLength={300} value={altMn} onChange={(event) => onChange({ ...value, altMn: event.target.value })} /></label>
        <label>{adminText(locale, "altEn")}<input required maxLength={300} value={altEn} onChange={(event) => onChange({ ...value, altEn: event.target.value })} /></label>
      </div>
    </div>
  );
}
