import type {
  AppData,
  ConvoMeta,
  DayCode,
  FeedItem,
  PastEntry,
  RoleDef,
  Talent,
} from "./types";

function asset(name: string) {
  return `/assets/${name}.webp`;
}

export const ME = {
  venue: {
    name: "The Larkspur",
    sub: "Venue · One Michelin star · Mayfair",
    mono: "L",
    photo: asset("venue-larkspur-dining"),
  },
  talent: {
    name: "Camille Aubert",
    sub: "Chef · Verified member",
    mono: "C",
    photo: asset("talent-camille-portrait"),
  },
} as const;

export const VENUE_PROFILE = {
  name: "The Larkspur",
  pedigree: "One Michelin star · Mayfair",
  spec: "Modern British · wood grill",
  mono: "L",
  photo: asset("venue-larkspur-dining"),
  verified: true,
  chips: [
    ["Covers", "42 nightly"],
    ["Brigade", "14 chefs"],
    ["Michelin", "One star"],
    ["Area", "Mayfair"],
  ] as [string, string][],
  look: [
    { mono: "L", photo: asset("venue-larkspur-dining") },
    { mono: "01" },
    { mono: "02" },
    { mono: "03" },
  ],
  about:
    "Forty-two covers, counter seats at the pass, a wood grill that anchors the menu. A one-star room in Mayfair, built around fire and quiet precision.",
  reviews: [
    {
      q: "The room gave me the pass and got out of the way — fire, precision, and a brigade that trusted me by service two.",
      a: "Camille Aubert · Guest Chef",
    },
    { q: "Forty-two covers and never once out of rhythm.", a: "Elodie Marchetti · Sommelier" },
  ],
};

export const PROP = {
  role: "Guest Chef",
  dates: "Fri 12 – Sun 14 Sep",
  rate: "£750 / day",
  venue: "The Larkspur · Mayfair",
};

export const TALENT: Record<string, Talent> = {
  camille: {
    id: "camille",
    name: "Camille Aubert",
    short: "Camille",
    role: "Chef",
    mono: "C",
    photo: asset("talent-camille-portrait"),
    verified: true,
    pedigree: "ex-The Fat Duck · ex-Core by Clare Smyth",
    spec: "Live-fire modern British",
    metric: "4.97 · 38 covers completed",
    chips: [
      ["At one-star level", "9 years"],
      ["Brigade led", "14 chefs"],
      ["Covers on Dyuknow", "38"],
      ["Rating", "4.97 / 5"],
    ],
    look: [
      { mono: "C", photo: asset("talent-camille-portrait") },
      { mono: "01", photo: asset("talent-camille-dish-1") },
      { mono: "02", photo: asset("talent-camille-dish-2") },
      { mono: "03", photo: asset("talent-camille-dish-3") },
    ],
    about:
      "Open fire, British produce, quiet precision. Camille has led one-star brigades for nine years and covers passes she respects — a single service, a weekend, a residency.",
    reviews: [
      {
        q: "She ran the pass like she had been here for years. The brigade would have followed her anywhere.",
        a: "General Manager · The Meridian",
      },
      { q: "Calm, exact, completely in command of the fire.", a: "Owner · Halcyon House" },
    ],
    convo: "larkspur-camille",
    scarcity: "2 other venues viewing",
  },
  theo: {
    id: "theo",
    name: "Theo Marchetti",
    short: "Theo",
    role: "Chef",
    mono: "T",
    photo: asset("talent-chef-2"),
    verified: true,
    pedigree: "ex-The Ledbury · ex-Kitchen Table",
    spec: "Produce-led modern European",
    metric: "4.90 · 24 covers",
    chips: [
      ["At one-star level", "7 years"],
      ["Brigade led", "10 chefs"],
      ["Covers on Dyuknow", "24"],
      ["Rating", "4.90 / 5"],
    ],
    look: [{ mono: "T", photo: asset("talent-chef-2") }],
    about: "A steady, produce-first hand. Theo covers passes across Mayfair and Fitzrovia between projects.",
    reviews: [{ q: "A steady hand — the room never felt the change.", a: "GM · Charlotte Street house" }],
    scarcity: "1 other venue viewing",
  },
  aiden: {
    id: "aiden",
    name: "Aiden Clarke",
    short: "Aiden",
    role: "Chef",
    mono: "A",
    photo: asset("talent-chef-3"),
    verified: true,
    pedigree: "ex-Lyle’s · ex-Brat",
    spec: "Open-fire British",
    metric: "4.85 · 19 covers",
    chips: [
      ["At level", "6 years"],
      ["Brigade led", "8 chefs"],
      ["Covers on Dyuknow", "19"],
      ["Rating", "4.85 / 5"],
    ],
    look: [{ mono: "A", photo: asset("talent-chef-3") }],
    about: "Grill-first cooking, whole beasts, short menus held to a high line.",
    reviews: [{ q: "Held a difficult Saturday together without a word.", a: "GM · The Dorian" }],
    scarcity: null,
  },
  ines: {
    id: "ines",
    name: "Inès Moreau",
    short: "Inès",
    role: "Chef",
    mono: "I",
    photo: asset("talent-chef-4"),
    verified: true,
    pedigree: "ex-Septime, Paris · ex-The Clove Club",
    spec: "Produce-led modern French",
    metric: "4.92 · 27 covers",
    chips: [
      ["At one-star level", "8 years"],
      ["Brigade led", "12 chefs"],
      ["Covers on Dyuknow", "27"],
      ["Rating", "4.92 / 5"],
    ],
    look: [{ mono: "I", photo: asset("talent-chef-4") }],
    about: "Paris-trained, London-fluent. Inès takes weekend covers and short residencies only.",
    reviews: [{ q: "Guests asked if she was staying. Twice.", a: "Owner · Rochelle House" }],
    scarcity: null,
  },
  elodie: {
    id: "elodie",
    name: "Élodie Marchand",
    short: "Élodie",
    role: "Sommelier",
    mono: "É",
    photo: asset("talent-sommelier-1"),
    verified: true,
    pedigree: "Master Sommelier · ex-The Ledbury cellar",
    spec: "Burgundy & Jura · FR · EN · IT",
    metric: "4.96 · 31 services",
    chips: [
      ["Certification", "Master Sommelier"],
      ["Regions", "Burgundy · Jura"],
      ["Languages", "FR · EN · IT"],
      ["At level", "12 years"],
    ],
    look: [{ mono: "É", photo: asset("talent-sommelier-1") }],
    about: "The certification comes first; the room comes easy. Élodie runs cellars and floors with equal calm.",
    reviews: [{ q: "The wine room ran itself. Guests noticed.", a: "GM · The Larkspur" }],
    convo: "larkspur-elodie",
    scarcity: null,
  },
  noor: {
    id: "noor",
    name: "Noor Haddad",
    short: "Noor",
    role: "Pastry Chef",
    mono: "N",
    photo: asset("talent-pastry-1"),
    verified: true,
    pedigree: "ex-Claridge’s · ex-Core pastry",
    spec: "Plated desserts · viennoiserie",
    metric: "Valrhona C3 finalist",
    chips: [
      ["Discipline", "Plated · viennoiserie"],
      ["Competitions", "C3 finalist ’25"],
      ["At level", "8 years"],
      ["Rating", "4.94 / 5"],
    ],
    look: [
      { mono: "N", photo: asset("talent-pastry-1") },
      { mono: "01", photo: asset("talent-pastry-dish-1") },
    ],
    about: "Image-first pastry — plated work with restraint, laminated doughs without apology.",
    reviews: [{ q: "The dessert course carried the evening.", a: "GM · The Meridian" }],
    scarcity: null,
  },
  dario: {
    id: "dario",
    name: "Dario Vela",
    short: "Dario",
    role: "Bartender",
    mono: "D",
    photo: asset("talent-bartender-1"),
    verified: true,
    pedigree: "ex-Connaught Bar · ex-Tayēr + Elementary",
    spec: "Classics · low-ABV programmes",
    metric: "World Class GB finalist",
    chips: [
      ["Bar pedigree", "World’s 50 Best rooms"],
      ["Competitions", "World Class GB finalist"],
      ["Style", "Classics · low-ABV"],
      ["Rating", "4.91 / 5"],
    ],
    look: [{ mono: "D", photo: asset("talent-bartender-1") }],
    about: "Hotel-bar polish, guest-first pace. Dario covers bars for openings, absences and one-night takeovers.",
    reviews: [{ q: "Regulars still ask when he is coming back.", a: "Bars director · The Ansley" }],
    scarcity: null,
  },
  beatrice: {
    id: "beatrice",
    name: "Beatrice Lang",
    short: "Beatrice",
    role: "Maître d’",
    mono: "B",
    photo: asset("talent-maitred-1"),
    verified: true,
    pedigree: "ex-The Wolseley · ex-Sketch",
    spec: "Old-school service · quiet authority",
    metric: "180 covers a night",
    chips: [
      ["Rooms run", "The Wolseley · Sketch"],
      ["Covers a night", "180"],
      ["Languages", "EN · DE · FR"],
      ["At level", "11 years"],
    ],
    look: [{ mono: "B", photo: asset("talent-maitred-1") }],
    about: "A room in her hands feels lighter. Beatrice covers floors during leadership absences and openings.",
    reviews: [{ q: "The floor did not miss a beat for two weeks.", a: "Owner · Mount Street room" }],
    scarcity: null,
  },
  nadia: {
    id: "nadia",
    name: "Nadia Reyes",
    short: "Nadia",
    role: "Mixologist",
    mono: "N",
    photo: asset("talent-bartender-1"),
    verified: true,
    pedigree: "ex-Artesian · ex-American Bar",
    spec: "Signature programmes · seasonal menus",
    metric: "Diageo World Class GB semi-finalist",
    chips: [
      ["Bar pedigree", "Artesian · American Bar"],
      ["Competitions", "World Class GB semi-finalist"],
      ["Style", "Signature · seasonal"],
      ["Rating", "4.88 / 5"],
    ],
    look: [{ mono: "N", photo: asset("talent-bartender-1") }],
    about: "Menu-led, guest-first. Nadia builds and runs signature cocktail programmes for openings, takeovers and one-off events.",
    reviews: [{ q: "Guests still order her opening-night menu by name.", a: "Bars manager · The Larkspur" }],
    scarcity: null,
  },
};

export const TEAM_CATEGORIES = ["Chef", "Front of House"];

export const CHEF_POSITIONS = [
  "Demi CDP",
  "CDP",
  "Senior CDP",
  "Junior Sous",
  "Sous Chef",
  "Head Chef",
  "Executive Chef",
  "Pastry Chef",
];

export const FOH_POSITIONS = ["Waiter", "Section Waiter", "Supervisor", "Restaurant Manager", "Bartender", "Host", "Mixologist"];

export const CHEF_SKILLS = [
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
  "Sushi / Fish Specialist",
  "Butchery",
  "Events",
  "Private Dining",
  "Production Kitchen",
];

export const FOH_SKILLS = [
  "Wine Service",
  "Cocktails",
  "Coffee",
  "Silver Service",
  "Events",
  "Hotel",
  "Fine Dining",
  "High Volume",
  "Reservations",
  "Barista",
];

export const YEARS_BANDS = ["0–2", "3–5", "5–10", "10+"];

export const SHIFT_TYPES = ["Breakfast", "Lunch", "Dinner", "Late", "Weekdays", "Weekends"];

export const MAX_TRAVEL_OPTIONS = ["3 miles", "5 miles", "10 miles", "Anywhere"];

export const LONDON_AREAS = ["West London", "East London", "Central", "North", "South"];

export const HOURLY_RATE_OPTIONS = ["£18", "£20", "£22+"];

export const CHEF_KNOWN_FOR = [
  "Calm under pressure",
  "Strong organiser",
  "Great on service",
  "Excellent prep",
  "Fast learner",
  "Clean worker",
  "Team player",
  "Great with junior chefs",
  "Reliable",
  "Problem solver",
  "Creative",
  "Strong palate",
];

export const FOH_KNOWN_FOR = [
  "Warm personality",
  "Excellent wine knowledge",
  "Fast service",
  "Great communicator",
  "Upselling",
  "Calm under pressure",
  "Cocktail knowledge",
  "Coffee",
  "Leadership",
  "Professional",
];

export function knownForOptions(category: string): string[] {
  return category === "Chef" ? CHEF_KNOWN_FOR : FOH_KNOWN_FOR;
}

export const TEAM_AGREEMENTS = [
  "Turn up on time",
  "Treat every venue with respect",
  "Give notice if cancelling",
  "Represent Dyuknow professionally",
];

export const VENUE_TYPES = ["Restaurant", "Hotel", "Pub", "Bar", "Private Members Club", "Events", "Catering", "Bakery", "Other"];

// The doc lists "Italian, French, British, Asian, etc." as examples rather than
// a full set — this is a placeholder list pending the real one.
export const CUISINES = [
  "British",
  "Italian",
  "French",
  "Spanish",
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

export const ROLES_NEEDED = ["Chefs", "FOH", "Bartenders", "Managers", "Events"];

export const TYPICAL_NOTICE = ["Today", "Tomorrow", "Planned"];

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

export const VENUE_AGREEMENTS = [
  "Pay fairly",
  "Treat temporary team like our own",
  "Provide a clear brief",
  "Rate honestly",
];

export const ROLES: RoleDef[] = [
  {
    id: "head-chef",
    name: "Chef",
    mono: "H",
    photo: asset("role-headchef-tile"),
    metric: "6 available this weekend",
    sub: "Cover the pass · Fri 12 – Sun 14 Sep",
    top: "camille",
    talent: ["theo", "aiden", "ines"],
  },
  {
    id: "sommelier",
    name: "Sommelier",
    mono: "S",
    photo: asset("talent-sommelier-1"),
    metric: "3 available",
    sub: "Certified · cellar-ready",
    top: null,
    talent: ["elodie"],
  },
  {
    id: "pastry-chef",
    name: "Pastry Chef",
    mono: "P",
    photo: asset("talent-pastry-1"),
    metric: "4 available",
    sub: "Plated · viennoiserie · showpiece",
    top: null,
    talent: ["noor"],
  },
  {
    id: "bartender",
    name: "Bartender",
    mono: "B",
    photo: asset("talent-bartender-1"),
    metric: "5 available",
    sub: "World-class rooms · takeovers",
    top: null,
    talent: ["dario"],
  },
  {
    id: "maitre-d",
    name: "Maître d’",
    mono: "M",
    photo: asset("talent-maitred-1"),
    metric: "3 available",
    sub: "Floors · covers · languages",
    top: null,
    talent: ["beatrice"],
  },
  {
    id: "mixologist",
    name: "Mixologist",
    mono: "X",
    photo: asset("talent-bartender-1"),
    metric: "4 available",
    sub: "Signature menus · pop-ups",
    top: null,
    talent: ["nadia"],
  },
];

export const FEED: FeedItem[] = [
  {
    id: "larkspur",
    venue: "The Larkspur",
    area: "Mayfair · One Michelin star",
    mono: "L",
    photo: asset("venue-larkspur-dining"),
    role: "Guest Chef",
    dates: "Fri 12 – Sun 14 Sep",
    rate: "£750 / day",
    tag: "Modern British",
    isNew: true,
    when: "NEW · 12 min ago",
    scarcity: "4 viewing · closes 20:00",
    room: "Forty-two covers, counter seats at the pass, a wood grill that anchors the menu. The brigade of fourteen stays; the pass is yours Friday to Sunday.",
    noteQ: "Our head chef is with family in Lyon that weekend. We want someone who cooks fire like it’s a language — the room will look after you.",
    noteA: "Jonathan Reeve · General Manager",
    convo: "larkspur-camille",
    cta: "conversation",
  },
  {
    id: "meridian",
    venue: "The Meridian",
    area: "St James’s · Members’ club",
    mono: "M",
    photo: asset("venue-members-club"),
    role: "Guest Chef",
    dates: "Tue 16 – Thu 18 Sep",
    rate: "£680 / day",
    tag: "French",
    isNew: false,
    when: "Today · 09:40",
    scarcity: "2 viewing · closes Thursday",
    room: "Sixty covers under a glass roof, a membership that dines early and stays late. Three quiet mid-week services.",
    noteQ: "Three quiet services for a discerning room. The cellar is yours to lean on.",
    noteA: "Membership office",
    convo: "meridian-camille",
    cta: "conversation",
  },
  {
    id: "ansley",
    venue: "The Ansley",
    area: "Marylebone · Hotel bar & kitchen",
    mono: "A",
    photo: asset("venue-hotel-bar"),
    role: "Chef’s counter · one night",
    dates: "Sat 20 Sep",
    rate: "£900 · one night",
    tag: "One night",
    isNew: false,
    when: "Yesterday",
    scarcity: "6 viewing · closes tonight",
    room: "Twelve seats at the bar counter, one sitting, carte blanche. Wine pairing run by the house.",
    noteQ: "One night, your menu, our room. We print nothing until you say so.",
    noteA: "Bars & dining director",
    convo: null,
    cta: "intro",
  },
  {
    id: "belgravia",
    venue: "Private dining room",
    area: "Belgravia · Discreet client",
    mono: "B",
    role: "Residency · two weeks",
    dates: "From Mon 22 Sep",
    rate: "Rate on request",
    tag: "Residency",
    isNew: false,
    when: "This week",
    scarcity: "By referral only",
    room: "A private room for a family in residence — ten covers nightly, produce flown in, absolute discretion.",
    noteQ: "Details shared after introduction.",
    noteA: "Household office",
    convo: null,
    cta: "intro",
  },
];

export const CHIPS = ["All", "Modern British", "French", "One night", "Residency"];

export const CONVOS: Record<string, ConvoMeta> = {
  "larkspur-camille": {
    venue: "The Larkspur",
    venueSub: "Jonathan Reeve · General Manager",
    venueMono: "L",
    venuePhoto: asset("venue-larkspur-dining"),
    talent: "camille",
    hasProposal: true,
  },
  "larkspur-elodie": {
    venue: "The Larkspur",
    venueSub: "Jonathan Reeve · General Manager",
    venueMono: "L",
    venuePhoto: asset("venue-larkspur-dining"),
    talent: "elodie",
    hasProposal: false,
  },
  "meridian-camille": {
    venue: "The Meridian",
    venueSub: "Membership office",
    venueMono: "M",
    venuePhoto: asset("venue-members-club"),
    talent: "camille",
    hasProposal: false,
  },
};

export const PAST: Record<"venue" | "talent", PastEntry[]> = {
  venue: [
    {
      title: "Élodie Marchand",
      sub: "Guest Sommelier · one service",
      dates: "Sat 21 Jun",
      mono: "É",
      photo: asset("talent-sommelier-1"),
    },
    {
      title: "Aiden Clarke",
      sub: "Guest Chef · two services",
      dates: "Fri 2 – Sat 3 May",
      mono: "A",
      photo: asset("talent-chef-3"),
    },
  ],
  talent: [
    { title: "Halcyon House", sub: "Residency · one week", dates: "Mon 3 – Sun 9 Mar", mono: "H" },
    {
      title: "The Meridian",
      sub: "Guest Chef · one service",
      dates: "Sat 14 Feb",
      mono: "M",
      photo: asset("venue-members-club"),
    },
  ],
};

export const DAY_DEFS: [DayCode, string][] = [
  ["Fri", "12"],
  ["Sat", "13"],
  ["Sun", "14"],
  ["Mon", "15"],
  ["Tue", "16"],
  ["Wed", "17"],
  ["Thu", "18"],
];

export function defaultAppData(): AppData {
  return {
    proposal: "none",
    avail: { Fri: true, Sat: true, Sun: true, Mon: false, Tue: true, Wed: false, Thu: true },
    convos: {
      "larkspur-camille": [
        {
          from: "venue",
          kind: "text",
          text: "Camille — our head chef is in Lyon Fri to Sun. Forty-two covers, wood grill, brigade of fourteen. Would you take the pass?",
        },
        {
          from: "talent",
          kind: "text",
          text: "I know The Larkspur — beautiful room, serious grill. Tell me about the menu you’d want held.",
        },
      ],
      "larkspur-elodie": [
        { from: "venue", kind: "text", text: "Élodie — thank you again for June. The cellar has missed you." },
        { from: "talent", kind: "text", text: "A pleasure. Say the word for the autumn list." },
      ],
      "meridian-camille": [
        {
          from: "venue",
          kind: "text",
          text: "Camille — would you consider three quiet services under the glass roof, Tue to Thu?",
        },
      ],
    },
    read: { venue: { "larkspur-elodie": true }, talent: { "meridian-camille": false, "larkspur-camille": true } },
    seenBooking: { venue: true, talent: true },
    saved: {},
    intros: {},
    onboarded: { venue: false, talent: false },
    venueIdentity: null,
    talentIdentity: null,
    availWindow: { from: "12:00", to: "23:00" },
  };
}
