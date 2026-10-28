"use client";

import { useRef, useState } from "react";
import { PhotoCropper } from "@/components/ui/PhotoCropper";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { fileToDataUrl } from "@/lib/image";

interface PhotoUploadStepProps {
  mono: string;
  photo: string | null;
  onPhoto: (dataUrl: string | null) => void;
}

export function PhotoUploadStep({ mono, photo, onPhoto }: PhotoUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<File | null>(null);

  async function handleFile(file: File) {
    setPicked(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setError(null);
      onPhoto(dataUrl);
    } catch {
      setError("Couldn't read that image — try another, or take a new photo.");
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-[160px] w-[128px] cursor-pointer items-center justify-center rounded-[24px] border-2 border-dashed border-hairline p-1 transition-colors hover:border-ink lg:h-[200px] lg:w-[160px]"
      >
        {photo ? (
          <PhotoTile mono={mono} photoUrl={photo} className="h-full w-full rounded-[19px]" />
        ) : (
          <span className="px-4 text-center text-[12.5px] font-semibold leading-[1.4] text-muted lg:text-[13.5px]">
            Tap to add a photo
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setPicked(file);
          e.target.value = "";
        }}
      />
      {picked && <PhotoCropper file={picked} onCancel={() => setPicked(null)} onCrop={handleFile} />}
      {error && <div className="text-[12.5px] font-semibold text-ink lg:text-[13.5px]">{error}</div>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer text-[13px] font-semibold text-ink underline underline-offset-2 lg:text-[14px]"
      >
        {photo ? "Change photo" : "Choose a photo"}
      </button>
    </div>
  );
}
