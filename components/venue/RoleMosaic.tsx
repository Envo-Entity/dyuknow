import { PhotoMosaic } from "@/components/ui/PhotoMosaic";
import { ROLES } from "@/lib/data";
import type { RoleDef } from "@/lib/types";

// Cycles every 4 roles through tall / tall / square / wide shapes — no
// per-N tuning needed, any role count just keeps repeating the pattern.
const ASPECT_PATTERN = [
  "aspect-[3/5] md:aspect-[4/3.5]",
  "aspect-[2/3] md:aspect-[3/4]",
  "aspect-square",
  "aspect-[4/4.5] md:aspect-[4/3]",
];

export function RoleMosaic({ roles = ROLES }: { roles?: RoleDef[] }) {
  const items = roles.map((role) => ({ ...role, href: `/venue/role/${role.id}` }));

  return (
    <PhotoMosaic
      className="mt-7 md:mt-[38px]"
      items={items}
      aspectPattern={ASPECT_PATTERN}
      renderOverlay={(item) => (
        <>
          <div className="font-serif text-[19px] leading-[1.05] md:text-[22px]">{item.name}</div>
          <div className="text-xs text-muted">{item.metric}</div>
        </>
      )}
    />
  );
}
