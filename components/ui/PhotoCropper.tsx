"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { PHOTO_ASPECT, cropImage, displayableImage } from "@/lib/image";

interface PhotoCropperProps {
  file: File;
  onCrop: (cropped: File) => void;
  onCancel: () => void;
}

interface Natural {
  url: string;
  source: Blob;
  width: number;
  height: number;
}

const MAX_ZOOM = 3;

/**
 * Shows a picked photo in the one shape every photo takes on Dyuknow (4:5),
 * lets the member drag and zoom it into place, and hands back exactly what
 * the frame shows.
 */
export function PhotoCropper({ file, onCrop, onCancel }: PhotoCropperProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [image, setImage] = useState<Natural | null>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  // The image point (0–1 across, 0–1 down) at the frame's centre.
  const [centre, setCentre] = useState({ x: 0.5, y: 0.5 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let url = "";
    let cancelled = false;
    displayableImage(file)
      .then((source) => {
        url = URL.createObjectURL(source);
        const img = new Image();
        img.onload = () => {
          if (!cancelled) setImage({ url, source, width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => !cancelled && setError("Couldn't read that image — try another.");
        img.src = url;
      })
      .catch(() => !cancelled && setError("Couldn't read that image — try another."));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrame({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const ready = image && frame.width > 0;
  // Scale that just covers the frame at zoom 1, like object-fit: cover.
  const cover = ready ? Math.max(frame.width / image.width, frame.height / image.height) : 1;
  const scale = cover * zoom;
  const shown = ready ? { width: image.width * scale, height: image.height * scale } : { width: 0, height: 0 };

  // Where the image's top-left sits in the frame, never leaving a gap.
  const offset = {
    x: Math.min(0, Math.max(frame.width - shown.width, frame.width / 2 - centre.x * shown.width)),
    y: Math.min(0, Math.max(frame.height - shown.height, frame.height / 2 - centre.y * shown.height)),
  };

  // Moves the photo by screen pixels, from where it is actually shown.
  function moveBy(dx: number, dy: number, from = offset) {
    if (!shown.width) return;
    setCentre({
      x: (frame.width / 2 - from.x - dx) / shown.width,
      y: (frame.height / 2 - from.y - dy) / shown.height,
    });
  }

  function zoomTo(next: number) {
    // Re-anchor on what is visible so zooming starts from the shown position.
    moveBy(0, 0);
    setZoom(next);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    moveBy(e.clientX - d.x, e.clientY - d.y, { x: d.ox, y: d.oy });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = 12;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    moveBy(move[0], move[1]);
  }

  async function confirm() {
    if (!image) return;
    setSaving(true);
    try {
      const cropped = await cropImage(image.source, {
        x: -offset.x / scale,
        y: -offset.y / scale,
        width: frame.width / scale,
        height: frame.height / scale,
      });
      onCrop(cropped);
    } catch {
      setError("Couldn't crop that image — try another.");
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Position your photo"
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/55 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="flex w-full max-w-[400px] flex-col gap-4 rounded-t-[28px] bg-paper px-5 pb-6 pt-5 text-ink sm:rounded-[28px]">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[28px] leading-[1.05]">Position your photo</h2>
          <p className="text-[13px] text-muted">Drag to move it. This is how it will look everywhere on Dyuknow.</p>
        </div>
        <div
          ref={frameRef}
          tabIndex={0}
          aria-label="Photo frame. Use the arrow keys to move the photo."
          className="relative mx-auto w-full max-w-[300px] cursor-grab touch-none select-none overflow-hidden rounded-[26px] bg-fog outline-none focus-visible:ring-2 focus-visible:ring-ink active:cursor-grabbing"
          style={{ aspectRatio: PHOTO_ASPECT }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={onKeyDown}
          onWheel={(e) => zoomTo(Math.min(MAX_ZOOM, Math.max(1, zoom - e.deltaY / 400)))}
        >
          {ready && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-0 top-0 max-w-none"
              style={{ width: shown.width, height: shown.height, transform: `translate(${offset.x}px, ${offset.y}px)` }}
            />
          )}
        </div>
        <label className="flex items-center gap-3 text-[12.5px] font-semibold text-muted">
          Zoom
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!ready}
            onChange={(e) => zoomTo(Number(e.target.value))}
            className="flex-1 accent-ink"
          />
        </label>
        {error && <p role="alert" className="text-[12.5px] font-semibold text-ink">{error}</p>}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-full border border-border px-5 py-3 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!ready || saving}
            className="flex-1 cursor-pointer rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-50"
          >
            {saving ? "Saving…" : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
