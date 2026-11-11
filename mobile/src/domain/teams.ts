// Teams, their positions and their tile photos.
import { TEAMS } from "./catalogue.ts";

// An image module from `require` (a number in React Native), usable as an
// <Image source>.
export type TeamPhoto = number;

/** The tile photo for a team (any unknown team gets Kitchen's). */
export function teamPhoto(team: string): TeamPhoto {
  // Required lazily so plain Node (the tests) can load this file.
  switch (team) {
    case "Pastry":
      return require("../../assets/teams/pastry.webp");
    case "Bar":
      return require("../../assets/teams/bar.webp");
    case "Sommelier":
      return require("../../assets/teams/sommelier.webp");
    case "Floor":
      return require("../../assets/teams/floor.webp");
    default:
      return require("../../assets/teams/kitchen.webp");
  }
}

type Family = { roles: string[]; readonly photo: TeamPhoto };
function family(team: string, roles: readonly string[]): Family {
  return {
    roles: [...roles],
    get photo() {
      return teamPhoto(team);
    },
  };
}
// Teams and their positions come from the shared list; the app only adds
// the tile photography.
export const FAMILIES: Record<string, Family> = {
  Kitchen: family("Kitchen", TEAMS.Kitchen),
  Pastry: family("Pastry", TEAMS.Pastry),
  Bar: family("Bar", TEAMS.Bar),
  Sommelier: family("Sommelier", TEAMS.Sommelier),
  Floor: family("Floor", TEAMS.Floor),
};

// The team a set of positions belongs to: never stored, read from the list.
export function teamOf(roles: string[], fallback = "Kitchen") {
  return (
    Object.keys(FAMILIES).find((f) => roles.some((r) => FAMILIES[f].roles.includes(r))) ||
    fallback
  );
}
