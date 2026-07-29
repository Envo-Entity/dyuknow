"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { fileToRawDataUrl } from "@/lib/image";
import type { UploadedFile } from "@/lib/types";

interface UploadRowProps {
  label: string;
  optional?: boolean;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
}

export function UploadRow({ label, optional, value, onChange }: UploadRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await fileToRawDataUrl(file);
      setError(null);
      onChange({ name: file.name, dataUrl });
    } catch {
      setError("Couldn't read that file — try another.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
        {label}
        {optional && <span className="text-faint"> · optional</span>}
      </span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-hairline bg-paper px-4 py-3.5 text-left transition-colors hover:border-ink"
      >
        <span className={cn("truncate text-[14px]", value ? "font-semibold text-ink" : "text-faint")}>
          {value ? value.name : "Tap to upload"}
        </span>
        <span className="flex-none text-[12.5px] font-semibold text-ink underline underline-offset-2">
          {value ? "Change" : "Upload"}
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      {error && <div className="text-[12.5px] font-semibold text-ink">{error}</div>}
    </div>
  );
}
