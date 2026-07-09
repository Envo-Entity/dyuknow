import { cn } from "@/lib/cn";

interface PhotoTileProps {
  mono: string;
  photoUrl?: string;
  monoSize?: number;
  className?: string;
  dark?: boolean;
  children?: React.ReactNode;
}

/**
 * Renders member/venue photography when available. Slots without a photo
 * fall back to the grayscale monogram treatment.
 */
export function PhotoTile({ mono, photoUrl, monoSize = 64, className, dark = false, children }: PhotoTileProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        dark ? "bg-[#1c1c1c] text-white" : "bg-fog text-ink",
        className
      )}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div
          className="ph-mono absolute inset-0 flex items-center justify-center font-serif"
          style={{ fontSize: monoSize }}
        >
          {mono}
        </div>
      )}
      {children}
    </div>
  );
}
