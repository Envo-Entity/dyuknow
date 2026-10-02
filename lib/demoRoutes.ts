// Compatibility destinations for the previous demo's public URLs.
// The current sample world and its hash navigation remain unchanged.
const ACTORS = { venue: "spruce", talent: "poppy" } as const;
type DemoSide = keyof typeof ACTORS;

export function demoRoute(side: DemoSide, page = "home", id?: string) {
  return `/app#/${side}/${ACTORS[side]}/${page}${id ? `/${encodeURIComponent(id)}` : ""}`;
}

export function demoSetupRoute(side: DemoSide) {
  return `/app#/${side}/setup`;
}

export function legacyDemoDestination(pathname: string): string | null {
  const match = pathname.match(/^\/app\/(venue|talent)(?:\/(.*))?$/);
  if (!match) return null;
  const side = match[1] as DemoSide;
  const [screen, id] = (match[2] || "").split("/");
  if (screen === "onboarding") return demoSetupRoute(side);
  if (screen === "me") return demoRoute(side, "profile");
  if (screen === "messages" || screen === "chat") return demoRoute(side, "messages");
  if (screen === "bookings") return demoRoute(side, "bookings");
  if (side === "venue" && screen === "t" && id) {
    try {
      return demoRoute(side, "talent", decodeURIComponent(id));
    } catch {
      return demoRoute(side);
    }
  }
  return demoRoute(side);
}
