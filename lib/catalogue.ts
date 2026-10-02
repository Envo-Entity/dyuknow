// The shared option lists for profiles and shifts. Talent onboarding, the
// talent profile, venue onboarding and the venue's shift form all read from
// here (see docs/data-model.md). Shift texts and invite lists match on the
// exact position names, so nothing may be spelt differently anywhere else.

export const TEAMS = {
  Kitchen: [
    "Demi CDP",
    "CDP",
    "Senior CDP",
    "Junior Sous",
    "Sous Chef",
    "Head Chef",
    "Executive Chef",
  ],
  Pastry: ["Pastry Chef"],
  Bar: ["Bartender", "Mixologist"],
  Sommelier: ["Sommelier"],
  Floor: [
    "Maître d’",
    "Restaurant Manager",
    "Supervisor",
    "Section Waiter",
    "Waiter",
    "Host",
  ],
} as const satisfies Record<string, readonly string[]>;

export type Team = keyof typeof TEAMS;
export const TEAM_NAMES = Object.keys(TEAMS) as Team[];
export const POSITIONS: string[] = Object.values(TEAMS).flat();

// Skills are grouped for display only; a person can pick from both groups.
// Cuisines are a venue fact, not a talent skill, so they live in CUISINES.
export const SKILL_GROUPS = {
  Kitchen: [
    "Grill",
    "Fish",
    "Meat",
    "Pasta",
    "Pastry",
    "Bakery",
    "Breakfast",
    "High Volume",
    "Fine Dining",
    "Open Fire",
    "Wood Oven",
    "Sushi",
    "Sushi / Fish Specialist",
    "Butchery",
    "Events",
    "Private Dining",
    "Production Kitchen",
  ],
  "Front of house": [
    "Wine Service",
    "Cocktails",
    "Coffee",
    "Silver Service",
    "Events",
    "Hotel",
    "Fine Dining",
    "High Volume",
    "Reservations",
    "Guest Relations",
    "Barista",
  ],
} as const satisfies Record<string, readonly string[]>;
export const SKILLS: string[] = [...new Set(Object.values(SKILL_GROUPS).flat())];

export const SHIFT_ALERTS = [
  { value: "all", label: "All shifts in your positions" },
  { value: "soon", label: "Today and tomorrow only" },
  { value: "off", label: "Off" },
] as const;
export type ShiftAlert = (typeof SHIFT_ALERTS)[number]["value"];

export const VENUE_TYPES = [
  "Restaurant",
  "Hotel",
  "Pub",
  "Bar",
  "Private Members Club",
  "Events",
  "Catering",
  "Bakery",
  "Other",
];

export const CUISINES = [
  "British",
  "Italian",
  "French",
  "Spanish",
  "Seafood",
  "Asian",
  "Indian",
  "Japanese",
  "Chinese",
  "Middle Eastern",
  "American",
  "Mexican",
  "Mediterranean",
  "Modern European",
  "Other",
];

export const COVERS_BANDS = ["0–30", "30–60", "60–100", "100+"];

export const DRESS_CODES = ["Chef whites", "Blacks", "Casual"];

export const VENUE_KNOWN_FOR = [
  "Fast-paced service",
  "Great team culture",
  "Fine dining standards",
  "Creative food",
  "Training",
  "Supportive management",
  "Excellent food",
  "Career progression",
];
