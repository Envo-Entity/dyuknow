import { cn } from "@/lib/cn";

interface AvatarProps {
  mono: string;
  size?: number;
  tone?: "light" | "dark";
  className?: string;
  photoUrl?: string | null;
}

export function Avatar({ mono, size = 44, tone = "light", className, photoUrl }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative flex-none overflow-hidden rounded-full",
        tone === "dark" ? "bg-[#1c1c1c] text-white" : "bg-fog text-ink",
        className
      )}
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div
          className="ph-mono absolute inset-0 flex items-center justify-center font-serif"
          style={{ fontSize: size * 0.46 }}
        >
          {mono}
        </div>
      )}
    </div>
  );
}
