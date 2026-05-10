"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/cn";
import { FILE_BASE64_MAX_BYTES, FILE_STORAGE_MAX_BYTES } from "@/config/global";
import { getInsforge } from "@/lib/insforge-client";
import type { IntakeFile } from "@/types";

interface FileDropProps {
  label: string;
  accept: string;
  helpText?: string;
  value: IntakeFile | null;
  onChange: (file: IntakeFile | null) => void;
  /**
   * When set, the file is uploaded to this InsForge Storage bucket and the
   * resulting `url`/`key` are returned (no base64). When unset, the file is
   * read as a base64 data URL inline.
   */
  bucket?: string;
}

function readableSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function FileDrop({
  label,
  accept,
  helpText,
  value,
  onChange,
  bucket,
}: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<"idle" | "reading" | "uploading">("idle");
  const inputId = useId();

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    const cap = bucket ? FILE_STORAGE_MAX_BYTES : FILE_BASE64_MAX_BYTES;
    if (file.size > cap) {
      onChange({ name: file.name, size: file.size, type: file.type, oversize: true });
      return;
    }

    // Prefer inline base64 when the file fits — avoids the storage roundtrip
    // (faster) and sidesteps RLS on the storage `objects` table for guests.
    const fitsInline = file.size <= FILE_BASE64_MAX_BYTES;
    if (!bucket || fitsInline) {
      setBusy("reading");
      try {
        const base64 = await readAsDataURL(file);
        onChange({ name: file.name, size: file.size, type: file.type, base64 });
      } finally {
        setBusy("idle");
      }
      return;
    }

    setBusy("uploading");
    try {
      const insforge = getInsforge();
      const { data, error } = await insforge.storage.from(bucket).uploadAuto(file);
      if (error || !data) {
        console.error("[FileDrop] upload failed:", error);
        onChange({ name: file.name, size: file.size, type: file.type, oversize: true });
        return;
      }
      onChange({
        name: file.name,
        size: file.size,
        type: file.type,
        url: data.url,
        key: data.key,
        bucket,
      });
    } finally {
      setBusy("idle");
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--color-foreground)]">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed bg-[var(--color-surface-muted)] px-4 py-3 text-center text-sm transition-colors",
          dragOver
            ? "border-[var(--color-foreground)] bg-white"
            : "border-[var(--color-border-strong)] hover:bg-white",
        )}
      >
        {value ? (
          <div className="flex w-full items-center justify-between gap-3 text-left">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-[var(--color-foreground)]">
                {value.name}
              </span>
              <span className="text-xs text-[var(--color-foreground-muted)]">
                {readableSize(value.size)} · {value.type || "unknown"}
                {value.oversize ? " · too large to send to model" : ""}
                {value.url ? " · uploaded" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs font-medium text-[var(--color-foreground-muted)] underline-offset-2 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <span className="text-[var(--color-foreground)]">
              {busy === "uploading"
                ? "Uploading…"
                : busy === "reading"
                  ? "Reading file…"
                  : "Click to upload, or drag & drop"}
            </span>
            {helpText ? (
              <span className="text-xs text-[var(--color-foreground-muted)]">{helpText}</span>
            ) : null}
          </>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
