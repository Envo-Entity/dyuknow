import { cn } from "@/lib/cn";

interface PhotoTileProps {
  mono: string;
  monoSize?: number;
  className?: string;
  dark?: boolean;
  children?: React.ReactNode;
}

/**
 * Stands in for member/venue photography. The source design ships every
 * photo slot as a tiny placeholder asset meant to be replaced later, so
 * this renders the same grayscale monogram treatment instead of a broken image.
 */
export function PhotoTile({ mono, monoSize = 64, className, dark = false, children }: PhotoTileProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        dark ? "bg-[#1c1c1c] text-white" : "bg-fog text-ink",
        className
      )}
    >
      <div
        className="ph-mono absolute inset-0 flex items-center justify-center font-serif"
        style={{ fontSize: monoSize }}
      >
        {mono}
      </div>
      {children}
    </div>
  );
}
