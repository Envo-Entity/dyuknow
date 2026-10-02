export type Side = "venue" | "talent" | "owner";
export type ResponseStatus =
  | "invited"
  | "can-cover"
  | "booked"
  | "cancelled"
  | "declined"
  | "withdrawn"
  | "not-selected"
  | "lapsed";
export type Member = {
  id: string;
  side: "venue" | "talent";
  name: string;
  area: string;
  phone: string;
  photo: string;
  bio: string;
  roles: string[];
  skills: string[];
  approved: boolean;
  alert: "all" | "soon" | "off";
  address: string;
  contact: string;
  rate: number;
  note: string;
  previous: string[];
};
export type Service = {
  date: string;
  start: string;
  end: string;
  from: string;
  to: string;
};
export type Shift = {
  id: string;
  venue: string;
  roles: string[];
  family: string;
  days: Service[];
  capacity: number;
  rate: number;
  note: string;
  mode: "post" | "invite";
  status: "open" | "filled" | "closed" | "expired";
  created: string;
  replacement?: string;
  address?: string;
  contact?: string;
  phone?: string;
  ownerAlerted: boolean;
};
export type Response = {
  id: string;
  shift: string;
  talent: string;
  source: "invite" | "response";
  status: ResponseStatus;
  note: string;
  chat: boolean;
};
export type Booking = {
  id: string;
  shift: string;
  talent: string;
  cancelled: boolean;
  reason?: string;
  by?: string;
  cancelledAt?: string;
  bookedAt?: string;
  outcomes: Record<string, string>;
};
export type Message = {
  id: string;
  response: string;
  from: string;
  text: string;
  time: string;
  system: boolean;
};
export type Notice = {
  id: string;
  to: string;
  title: string;
  text: string;
  target: string;
  read: boolean;
  time: string;
};
export type Availability = {
  member: string;
  date: string;
  kind: "free" | "not-free";
  start: string;
  end: string;
};
export type Data = {
  version: 1;
  now: string;
  members: Member[];
  shifts: Shift[];
  responses: Response[];
  bookings: Booking[];
  messages: Message[];
  notices: Notice[];
  availability: Availability[];
  read: Record<string, string>;
  messageDrafts: Record<string, string>;
  draft: Partial<ShiftDraft> | null;
  drafts?: Record<string, Partial<ShiftDraft> | null>;
  offline: boolean;
  failNext: boolean;
  reminders?: string[];
  setupDrafts?: Record<
    string,
    {
      member: Member;
      step: number;
      availability: boolean;
      availabilityDates?: string[];
      availabilityPeriod?: "day" | "evening";
    }
  >;
};
export type ShiftDraft = {
  roles: string[];
  family: string;
  date: string;
  count: number;
  start: string;
  end: string;
  capacity: number;
  rate: number;
  note: string;
  mode: "post" | "invite";
  invitees: string[];
  replacement?: string;
  editing?: string;
  repeatTalent?: string;
};
export const FAMILIES: Record<
  string,
  { roles: string[]; photo: string; caption: string }
> = {
  Kitchen: {
    roles: [
      "Demi CDP",
      "CDP",
      "Senior CDP",
      "Junior Sous",
      "Sous Chef",
      "Head Chef",
      "Executive Chef",
    ],
    photo: "/assets/role-headchef-tile.webp",
    caption: "A steady hand at the pass",
  },
  Pastry: {
    roles: ["Pastry Chef"],
    photo: "/assets/talent-pastry-dish-1.webp",
    caption: "Precision to the last course",
  },
  Bar: {
    roles: ["Bartender", "Mixologist"],
    photo: "/assets/talent-bartender-1.webp",
    caption: "Keep the evening flowing",
  },
  Sommelier: {
    roles: ["Sommelier"],
    photo: "/assets/talent-sommelier-1.webp",
    caption: "Every bottle, thoughtfully served",
  },
  Floor: {
    roles: [
      "Maître d’",
      "Restaurant Manager",
      "Supervisor",
      "Section Waiter",
      "Waiter",
      "Host",
    ],
    photo: "/assets/talent-maitred-1.webp",
    caption: "The people who hold the room",
  },
};
export const SKILLS = [
  "Fine dining",
  "Live fire",
  "Modern British",
  "Pastry",
  "Wine service",
  "Cocktails",
  "High volume",
  "Events",
  "Coffee",
  "French cuisine",
  "Guest relations",
];
export function uid() {
  return crypto.randomUUID();
}
export function datePlus(date: string, count: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}
export function londonDate(now: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}
export function displayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(new Date(`${date}T12:00:00Z`));
}
export function clockLabel(now: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(now));
}
// Resolve London wall time using the timezone database, including overnight/DST.
// Ambiguous and nonexistent wall times require another selection in this preview.
export function londonInstant(date: string, time: string) {
  const target = `${date} ${time}`;
  const guess = Date.parse(`${date}T${time}:00Z`);
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const matches = [guess - 3600000, guess, guess + 3600000].filter(
    (t) => fmt.format(new Date(t)) === target,
  );
  if (matches.length !== 1)
    throw new Error(
      matches.length
        ? "This London time occurs twice when the clocks change. Choose a time outside 01:00–02:00."
        : "This London time does not exist when the clocks change. Choose a different hour.",
    );
  return new Date(matches[0]).toISOString();
}
export function makeDays(d: ShiftDraft): Service[] {
  if (!Number.isInteger(d.count) || d.count < 1 || d.count > 7)
    throw new Error("Choose between 1 and 7 consecutive dates.");
  if (!d.date || !d.start || !d.end || d.start === d.end)
    throw new Error("Choose a date and different start and end times.");
  return Array.from({ length: d.count }, (_, i) => {
    const date = datePlus(d.date, i);
    const endDate = d.end < d.start ? datePlus(date, 1) : date;
    return {
      date,
      start: d.start,
      end: d.end,
      from: londonInstant(date, d.start),
      to: londonInstant(endDate, d.end),
    };
  });
}
export function serviceLabel(s: Service) {
  return `${displayDate(s.date)} · ${s.start}${s.end < s.start ? ` → ${displayDate(datePlus(s.date, 1))} ${s.end}` : `–${s.end}`}`;
}
export function overlap(a: Service[], b: Service[]) {
  return a.some((x) => b.some((y) => x.from < y.to && y.from < x.to));
}
export function bookedCount(data: Data, shift: string) {
  return data.bookings.filter((b) => b.shift === shift && !b.cancelled).length;
}
export function conflict(
  data: Data,
  talent: string,
  days: Service[],
  exclude?: string,
) {
  return data.bookings.find(
    (b) =>
      b.talent === talent &&
      !b.cancelled &&
      b.shift !== exclude &&
      overlap(days, data.shifts.find((s) => s.id === b.shift)!.days),
  );
}
export function isFree(data: Data, talent: string, days: Service[]) {
  if (conflict(data, talent, days)) return false;
  return days.every((day) =>
    data.availability
      .filter((a) => a.member === talent && a.kind === "free")
      .some((a) => {
        try {
          const start = londonInstant(a.date, a.start);
          const end = londonInstant(
            a.end <= a.start ? datePlus(a.date, 1) : a.date,
            a.end,
          );
          return start <= day.from && end >= day.to;
        } catch {
          return false;
        }
      }),
  );
}
export function member(data: Data, id: string) {
  return data.members.find((m) => m.id === id)!;
}
export function shiftLabel(s: Shift) {
  return s.roles.join(" or ");
}
export function bookingPast(data: Data, b: Booking) {
  const s = data.shifts.find((s) => s.id === b.shift)!;
  return s.days[s.days.length - 1].to <= data.now;
}
export function responseLabel(r: Response) {
  return {
    invited: "Invitation waiting",
    "can-cover": "Waiting to hear",
    booked: "Booked",
    cancelled: "Cancelled",
    declined: "Declined",
    withdrawn: "Withdrawn",
    "not-selected": "Position filled",
    lapsed: "No longer available",
  }[r.status];
}
export function notify(
  data: Data,
  to: string,
  title: string,
  text: string,
  target: string,
) {
  data.notices.unshift({
    id: uid(),
    to,
    title,
    text,
    target,
    read: false,
    time: data.now,
  });
}
function event(data: Data, r: Response, text: string) {
  data.messages.push({
    id: uid(),
    response: r.id,
    from: "system",
    text,
    time: data.now,
    system: true,
  });
}
function closeWaiting(
  data: Data,
  s: Shift,
  text: string,
  status: ResponseStatus = "not-selected",
) {
  data.responses
    .filter(
      (r) => r.shift === s.id && ["invited", "can-cover"].includes(r.status),
    )
    .forEach((r) => {
      r.status = status;
      event(data, r, text);
      notify(
        data,
        r.talent,
        text,
        `${member(data, s.venue).name} · ${shiftLabel(s)}`,
        `shift/${s.id}`,
      );
    });
}
export function sweep(data: Data) {
  data.shifts.forEach((s) => {
    if (s.status === "open" && s.days[0].from <= data.now) {
      s.status = "expired";
      closeWaiting(data, s, "This shift has started", "lapsed");
      notify(
        data,
        s.venue,
        "Shift expired",
        "Unfilled places are now closed.",
        `shift/${s.id}`,
      );
    }
    if (
      s.status === "open" &&
      !s.ownerAlerted &&
      s.days[0].date === londonDate(data.now) &&
      Date.parse(data.now) - Date.parse(s.created) >= 1800000 &&
      !data.responses.some(
        (r) => r.shift === s.id && ["can-cover", "booked"].includes(r.status),
      )
    ) {
      s.ownerAlerted = true;
      notify(
        data,
        "owner",
        "Same-day cover needs help",
        `${member(data, s.venue).name} has no response after 30 minutes.`,
        `shift/${s.id}`,
      );
      notify(
        data,
        s.venue,
        "The owner is helping",
        "Nobody has responded yet. We have alerted the owner to help find cover.",
        `shift/${s.id}`,
      );
    }
  });
  data.reminders ??= [];
  for (const booking of data.bookings.filter((b) => !b.cancelled)) {
    const shift = data.shifts.find((s) => s.id === booking.shift)!;
    const first = shift.days[0];
    const bookedAt = booking.bookedAt || shift.created;
    const reminder =
      londonDate(bookedAt) === first.date
        ? new Date(Date.parse(first.from) - 7200000).toISOString()
        : londonInstant(datePlus(first.date, -1), "18:00");
    if (
      reminder > bookedAt &&
      reminder <= data.now &&
      first.from > data.now &&
      !data.reminders.includes(booking.id)
    ) {
      data.reminders.push(booking.id);
      notify(
        data,
        booking.talent,
        "Your next service is coming up",
        `${member(data, shift.venue).name} · ${serviceLabel(first)}. Check your arrival details.`,
        `booking/${booking.id}`,
      );
    }
  }
}
export function seed(): Data {
  const members: Member[] = [
    {
      id: "spruce",
      side: "venue",
      name: "Spruce",
      area: "Richmond",
      phone: "+44 7700 900101",
      photo: "/assets/venue-larkspur-dining.webp",
      bio: "A neighbourhood dining room built around seasonal British produce. A small team, a warm welcome and a considered evening service.",
      roles: [],
      skills: [],
      approved: true,
      alert: "all",
      address: "14 Church Road, Richmond, London TW9 1UA",
      contact: "Alex · Duty manager",
      rate: 18,
      note: "Chef whites · uniform provided · staff meal. Arrive 15 minutes early for a briefing.",
      previous: ["poppy"],
    },
    {
      id: "sea",
      side: "venue",
      name: "The Sea The Sea",
      area: "Chelsea",
      phone: "+44 7700 900102",
      photo: "/assets/venue-hotel-bar.webp",
      bio: "A seafood counter with an open kitchen. Thoughtful ingredients, close teamwork and a calm service.",
      roles: [],
      skills: [],
      approved: true,
      alert: "all",
      address: "174 Pavilion Road, Chelsea, London SW1X 0AW",
      contact: "Morgan · On-site manager",
      rate: 22,
      note: "Chef whites · staff meal · seafood counter service. Please bring your knives.",
      previous: ["camille"],
    },
    {
      id: "harper",
      side: "venue",
      name: "Harper Privé",
      area: "Mayfair",
      phone: "+44 7700 900103",
      photo: "/assets/venue-members-club.webp",
      bio: "Intimate private dinners and considered events. A welcoming room with precise service and a close-knit team.",
      roles: [],
      skills: [],
      approved: true,
      alert: "all",
      address: "8 Brook Street, Mayfair, London W1K 5DB",
      contact: "Jamie · Events manager",
      rate: 24,
      note: "Black shirt and trousers · staff meal · private dinner for 30 guests.",
      previous: [],
    },
    {
      id: "poppy",
      side: "talent",
      name: "Poppy Bertram",
      area: "Richmond",
      phone: "+44 7700 900201",
      photo: "/assets/talent-chef-4.webp",
      bio: "Five years in seasonal kitchens. Comfortable on a busy section, happiest working with British produce and a thoughtful team.",
      roles: ["CDP", "Senior CDP"],
      skills: ["Fine dining", "Modern British", "Live fire"],
      approved: true,
      alert: "all",
      address: "",
      contact: "",
      rate: 18,
      note: "",
      previous: [],
    },
    {
      id: "camille",
      side: "talent",
      name: "Camille Aubert",
      area: "Chelsea",
      phone: "+44 7700 900202",
      photo: "/assets/talent-camille-portrait.webp",
      bio: "A calm hand at the pass. Nine years leading kitchens, with a focus on open fire and seasonal British produce.",
      roles: ["Head Chef", "Sous Chef"],
      skills: ["Live fire", "Modern British", "Fine dining"],
      approved: true,
      alert: "all",
      address: "",
      contact: "",
      rate: 28,
      note: "",
      previous: [],
    },
    {
      id: "theo",
      side: "talent",
      name: "Theo Marchetti",
      area: "Fitzrovia",
      phone: "+44 7700 900203",
      photo: "/assets/talent-chef-2.webp",
      bio: "Produce-led cooking and a steady service. Six years on sections in contemporary London restaurants.",
      roles: ["CDP", "Senior CDP"],
      skills: ["French cuisine", "Fine dining"],
      approved: true,
      alert: "all",
      address: "",
      contact: "",
      rate: 20,
      note: "",
      previous: [],
    },
    {
      id: "ethan",
      side: "talent",
      name: "Ethan Russell",
      area: "Hackney",
      phone: "+44 7700 900204",
      photo: "/assets/talent-chef-3.webp",
      bio: "Experienced sous chef, comfortable leading a small brigade and supporting a busy evening service.",
      roles: ["Sous Chef", "Junior Sous"],
      skills: ["High volume", "Events"],
      approved: true,
      alert: "all",
      address: "",
      contact: "",
      rate: 24,
      note: "",
      previous: [],
    },
    {
      id: "noor",
      side: "talent",
      name: "Noor Haddad",
      area: "Soho",
      phone: "+44 7700 900205",
      photo: "/assets/talent-bartender-1.webp",
      bio: "Cocktail service with care and pace. Four years behind London hotel and restaurant bars.",
      roles: ["Bartender", "Mixologist"],
      skills: ["Cocktails", "High volume", "Guest relations"],
      approved: true,
      alert: "all",
      address: "",
      contact: "",
      rate: 20,
      note: "",
      previous: [],
    },
    {
      id: "ines",
      side: "talent",
      name: "Inès Laurent",
      area: "Kensington",
      phone: "+44 7700 900206",
      photo: "/assets/talent-maitred-1.webp",
      bio: "Thoughtful guest service, from intimate dinners to a busy dining room. Fluent in English and French.",
      roles: ["Waiter", "Host", "Section Waiter"],
      skills: ["Wine service", "Guest relations", "Fine dining"],
      approved: true,
      alert: "all",
      address: "",
      contact: "",
      rate: 18,
      note: "",
      previous: [],
    },
  ];
  const data: Data = {
    version: 1,
    now: "2026-10-01T09:00:00.000Z",
    members,
    shifts: [],
    responses: [],
    bookings: [],
    messages: [],
    notices: [],
    availability: [],
    read: {},
    messageDrafts: {},
    draft: null,
    offline: false,
    failNext: false,
  };
  for (const m of members.filter((m) => m.side === "talent" && m.id !== "theo"))
    for (let i = 0; i < 14; i++)
      data.availability.push({
        member: m.id,
        date: datePlus("2026-10-01", i),
        kind: "free",
        start: "16:00",
        end: "23:59",
      });
  const day = (date: string, start = "17:00", end = "23:00") =>
    makeDays({ date, start, end, count: 1 } as ShiftDraft);
  data.shifts = [
    {
      id: "spruce-friday",
      venue: "spruce",
      roles: ["CDP", "Senior CDP"],
      family: "Kitchen",
      days: day("2026-10-02"),
      capacity: 1,
      rate: 18,
      note: members[0].note,
      mode: "post",
      status: "open",
      created: data.now,
      ownerAlerted: false,
    },
    {
      id: "sea-saturday",
      venue: "sea",
      roles: ["Head Chef", "Sous Chef"],
      family: "Kitchen",
      days: day("2026-10-03", "18:00"),
      capacity: 1,
      rate: 28,
      note: members[1].note,
      mode: "invite",
      status: "open",
      created: data.now,
      ownerAlerted: false,
    },
    {
      id: "harper-weekend",
      venue: "harper",
      roles: ["CDP"],
      family: "Kitchen",
      days: makeDays({
        date: "2026-10-04",
        start: "17:00",
        end: "23:00",
        count: 3,
      } as ShiftDraft),
      capacity: 2,
      rate: 24,
      note: members[2].note,
      mode: "post",
      status: "open",
      created: data.now,
      ownerAlerted: false,
    },
    {
      id: "harper-bar",
      venue: "harper",
      roles: ["Bartender", "Mixologist"],
      family: "Bar",
      days: day("2026-10-02", "22:00", "02:00"),
      capacity: 1,
      rate: 22,
      note: "Black shirt · cocktail service · taxi home arranged directly with the venue.",
      mode: "post",
      status: "open",
      created: data.now,
      ownerAlerted: false,
    },
    {
      id: "spruce-floor",
      venue: "spruce",
      roles: ["Waiter"],
      family: "Floor",
      days: day("2026-10-07", "18:00"),
      capacity: 1,
      rate: 18,
      note: "Black shirt · staff meal · relaxed evening service.",
      mode: "post",
      status: "open",
      created: data.now,
      ownerAlerted: false,
    },
    {
      id: "past-poppy",
      venue: "spruce",
      roles: ["CDP"],
      family: "Kitchen",
      days: day("2026-09-28"),
      capacity: 1,
      rate: 18,
      note: members[0].note,
      mode: "invite",
      status: "filled",
      created: "2026-09-27T09:00:00.000Z",
      ownerAlerted: false,
    },
  ];
  data.responses = [
    {
      id: "invite-camille",
      shift: "sea-saturday",
      talent: "camille",
      source: "invite",
      status: "invited",
      note: "",
      chat: true,
    },
    {
      id: "past-response",
      shift: "past-poppy",
      talent: "poppy",
      source: "invite",
      status: "booked",
      note: "",
      chat: true,
    },
  ];
  data.bookings = [
    {
      id: "past-booking",
      shift: "past-poppy",
      talent: "poppy",
      cancelled: false,
      outcomes: { spruce: "Yes, worked", poppy: "Yes, worked" },
    },
  ];
  event(
    data,
    data.responses[0],
    "The Sea The Sea invited Camille. Accepting confirms a booking.",
  );
  notify(
    data,
    "camille",
    "The Sea The Sea invited you",
    "Sat 3 Oct · 18:00–23:00 · £28/h",
    "shift/sea-saturday",
  );
  for (const s of data.shifts.filter((s) => s.mode === "post"))
    for (const m of members.filter(
      (m) => m.side === "talent" && m.roles.some((r) => s.roles.includes(r)),
    ))
      notify(
        data,
        m.id,
        `${member(data, s.venue).name} needs cover`,
        `${shiftLabel(s)} · ${serviceLabel(s.days[0])} · £${s.rate}/h`,
        `shift/${s.id}`,
      );
  return data;
}
export type Action =
  | { type: "post"; actor: string; draft: ShiftDraft }
  | {
      type: "respond" | "accept" | "book" | "withdraw" | "decline";
      actor: string;
      shift: string;
      talent?: string;
      note?: string;
    }
  | { type: "close"; actor: string; shift: string; reason: string }
  | { type: "cancel"; actor: string; booking: string; reason: string }
  | { type: "message"; actor: string; response: string; text: string }
  | { type: "open-chat"; actor: string; response: string }
  | {
      type: "availability";
      actor: string;
      dates: string[];
      kind: "free" | "not-free";
      start: string;
      end: string;
    }
  | { type: "profile"; actor: string; patch: Partial<Member> }
  | { type: "read-notice"; actor: string; id?: string }
  | { type: "read-chat"; actor: string; response: string }
  | { type: "draft-message"; actor: string; response: string; text: string }
  | { type: "save-draft"; actor: string; draft: Partial<ShiftDraft> | null }
  | {
      type: "save-setup";
      side: "venue" | "talent";
      draft: {
        member: Member;
        step: number;
        availability: boolean;
        availabilityDates?: string[];
        availabilityPeriod?: "day" | "evening";
      };
    }
  | { type: "edit-note"; actor: string; shift: string; note: string }
  | { type: "invite"; actor: string; shift: string; talents: string[] }
  | { type: "nudge"; actor: string }
  | { type: "approve"; actor: string; member: string }
  | {
      type: "join";
      member: Member;
      availableTomorrow?: boolean;
      availabilityDates?: string[];
      availabilityPeriod?: "day" | "evening";
    }
  | { type: "outcome"; actor: string; booking: string; value: string }
  | { type: "advance"; until: string }
  | { type: "settings"; offline?: boolean; failNext?: boolean };
export function transition(original: Data, action: Action): Data {
  const data: Data = structuredClone(original);
  sweep(data);
  const utility = [
    "settings",
    "read-notice",
    "read-chat",
    "draft-message",
    "save-draft",
    "save-setup",
    "nudge",
    "advance",
  ];
  if (!utility.includes(action.type)) {
    if (data.offline)
      throw new Error(
        "You're offline. Your draft is kept. Reconnect in Preview controls, then try again.",
      );
    if (data.failNext)
      throw new Error(
        "The action could not be saved. Nothing was sent. Your draft is kept; try again.",
      );
    if (
      "actor" in action &&
      action.actor !== "owner" &&
      !member(data, action.actor)?.approved &&
      action.type !== "profile"
    )
      throw new Error("Your account is waiting for owner approval.");
  }
  if (action.type === "settings") {
    if (action.offline !== undefined) data.offline = action.offline;
    if (action.failNext !== undefined) data.failNext = action.failNext;
  }
  if (action.type === "advance") {
    if (action.until < data.now)
      throw new Error(
        "Preview time can only move forward. Reset stories to start again.",
      );
    data.now = action.until;
    sweep(data);
  }
  if (action.type === "save-draft") {
    data.drafts ??= {};
    data.drafts[action.actor] = action.draft;
    data.draft = action.draft;
  }
  if (action.type === "save-setup") {
    data.setupDrafts ??= {};
    data.setupDrafts[action.side] = action.draft;
  }
  if (action.type === "nudge")
    notify(
      data,
      action.actor,
      "Free this week?",
      "Update your next 14 days so venues know when to invite you.",
      "availability",
    );
  if (action.type === "edit-note") {
    const shift = data.shifts.find((s) => s.id === action.shift)!;
    if (shift.venue !== action.actor)
      throw new Error("Only this venue can edit its preparation note.");
    shift.note = action.note;
  }
  if (action.type === "invite") {
    const shift = data.shifts.find((s) => s.id === action.shift)!;
    if (shift.venue !== action.actor || shift.status !== "open")
      throw new Error("This shift is no longer open for invitations.");
    if (!action.talents.length) throw new Error("Choose at least one person.");
    for (const talent of action.talents) {
      const t = member(data, talent);
      if (
        !t?.approved ||
        t.side !== "talent" ||
        !t.roles.some((role) => shift.roles.includes(role))
      )
        throw new Error("Choose an approved member in these roles.");
      if (conflict(data, talent, shift.days))
        throw new Error(`${t.name} is booked for overlapping hours.`);
      let r = data.responses.find(
        (r) => r.shift === shift.id && r.talent === talent,
      );
      if (r && ["can-cover", "invited", "booked"].includes(r.status)) continue;
      if (r) {
        r.status = "invited";
        r.chat = true;
        r.source = "invite";
      } else {
        r = {
          id: uid(),
          shift: shift.id,
          talent,
          source: "invite",
          status: "invited",
          chat: true,
          note: "",
        };
        data.responses.push(r);
      }
      event(
        data,
        r,
        `${member(data, shift.venue).name} invited ${t.name}. Accepting books the service.`,
      );
      notify(
        data,
        talent,
        `${member(data, shift.venue).name} invited you`,
        `${serviceLabel(shift.days[0])} · £${shift.rate}/h`,
        `shift/${shift.id}`,
      );
    }
  }
  if (action.type === "draft-message")
    data.messageDrafts[`${action.actor}/${action.response}`] = action.text;
  if (action.type === "read-chat")
    data.read[`${action.actor}/${action.response}`] =
      data.messages.filter((m) => m.response === action.response).at(-1)?.id ||
      "";
  if (action.type === "read-notice")
    data.notices
      .filter(
        (n) => n.to === action.actor && (!action.id || action.id === n.id),
      )
      .forEach((n) => (n.read = true));
  if (action.type === "profile") {
    const m = member(data, action.actor);
    const {
      name,
      bio,
      roles,
      skills,
      alert,
      rate,
      note,
      address,
      contact,
      area,
      phone,
    } = action.patch;
    Object.assign(
      m,
      Object.fromEntries(
        Object.entries({
          name,
          bio,
          roles,
          skills,
          alert,
          rate,
          note,
          address,
          contact,
          area,
          phone,
        }).filter(([, v]) => v !== undefined),
      ),
    );
  }
  if (action.type === "join") {
    if (data.members.some((m) => m.phone === action.member.phone))
      throw new Error(
        "This phone belongs to a preloaded profile. Choose Claim existing profile.",
      );
    data.members.push({ ...action.member, approved: false });
    if (data.setupDrafts) delete data.setupDrafts[action.member.side];
    if (action.member.side === "talent") {
      const dates =
        action.availabilityDates ??
        (action.availableTomorrow ? [datePlus(londonDate(data.now), 1)] : []);
      for (const date of [...new Set(dates)]) {
        if (
          date < londonDate(data.now) ||
          date > datePlus(londonDate(data.now), 6)
        )
          throw new Error("Choose availability within the next seven days.");
        data.availability.push({
          member: action.member.id,
          date,
          kind: "free",
          start: action.availabilityPeriod === "day" ? "09:00" : "16:00",
          end: action.availabilityPeriod === "day" ? "17:00" : "23:59",
        });
      }
    }
    notify(
      data,
      "owner",
      "New member awaiting approval",
      action.member.name,
      "members",
    );
  }
  if (action.type === "approve") {
    if (action.actor !== "owner")
      throw new Error("Only the owner approves members.");
    member(data, action.member).approved = true;
    notify(
      data,
      action.member,
      "You're in",
      "The owner has approved your membership. You can now use Dyuknow.",
      "home",
    );
  }
  if (action.type === "post") {
    const d = action.draft;
    const venue = member(data, action.actor);
    if (venue.side !== "venue") throw new Error("Only venues can send shifts.");
    if (
      !d.roles.length ||
      !d.roles.every((r) => FAMILIES[d.family]?.roles.includes(r))
    )
      throw new Error("Choose the positions you would accept.");
    if (!(d.rate > 0) || !Number.isFinite(d.rate))
      throw new Error("Add an hourly rate in pounds.");
    if (!Number.isInteger(d.capacity) || d.capacity < 1 || d.capacity > 5)
      throw new Error("Choose between 1 and 5 people.");
    const days = makeDays(d);
    if (days[0].from <= data.now)
      throw new Error(
        "The shift must start in the future. Choose a later time.",
      );
    if (d.mode === "invite" && !d.invitees.length)
      throw new Error("Choose at least one person to invite.");
    if (d.editing) {
      const old = data.shifts.find((s) => s.id === d.editing)!;
      if (
        old.venue !== action.actor ||
        old.status !== "open" ||
        bookedCount(data, old.id)
      )
        throw new Error(
          "A booked shift cannot be edited. Cancel the booking and create a new shift.",
        );
      old.status = "closed";
      closeWaiting(
        data,
        old,
        "The venue edited and resent this shift. Please review the new terms.",
      );
    }
    const s: Shift = {
      id: uid(),
      venue: venue.id,
      roles: d.roles,
      family: d.family,
      days,
      capacity: d.capacity,
      rate: d.rate,
      note: d.note,
      mode: d.mode,
      status: "open",
      created: data.now,
      address: venue.address,
      contact: venue.contact,
      phone: venue.phone,
      replacement: d.replacement || d.editing,
      ownerAlerted: false,
    };
    data.shifts.unshift(s);
    data.draft = null;
    if (data.drafts) data.drafts[action.actor] = null;
    const eligible = data.members.filter(
      (m) =>
        m.side === "talent" &&
        m.approved &&
        m.roles.some((r) => s.roles.includes(r)),
    );
    if (d.mode === "post")
      eligible
        .filter(
          (m) =>
            m.alert === "all" ||
            (m.alert === "soon" &&
              days[0].date <= datePlus(londonDate(data.now), 1)),
        )
        .forEach((m) =>
          notify(
            data,
            m.id,
            `${venue.name} needs cover`,
            `${shiftLabel(s)} · ${serviceLabel(days[0])} · £${s.rate}/h`,
            `shift/${s.id}`,
          ),
        );
    else
      for (const id of d.invitees) {
        if (!eligible.some((m) => m.id === id))
          throw new Error(
            "An invitee must be an approved member in the selected roles.",
          );
        if (conflict(data, id, days))
          throw new Error(
            `${member(data, id).name} is booked then. Choose another member.`,
          );
        const r: Response = {
          id: uid(),
          shift: s.id,
          talent: id,
          source: "invite",
          status: "invited",
          chat: true,
          note: "",
        };
        data.responses.push(r);
        event(
          data,
          r,
          `${venue.name} invited ${member(data, id).name}. Accepting confirms the booking.`,
        );
        notify(
          data,
          id,
          `${venue.name} invited you`,
          `${serviceLabel(days[0])} · £${s.rate}/h`,
          `shift/${s.id}`,
        );
      }
    if (!eligible.length) {
      s.ownerAlerted = true;
      notify(
        data,
        "owner",
        "No members for this shift",
        `${venue.name} needs ${shiftLabel(s)}. Please help source cover.`,
        `shift/${s.id}`,
      );
      notify(
        data,
        venue.id,
        "The owner is helping find cover",
        "There are no members in this role yet. We have asked the owner to help.",
        `shift/${s.id}`,
      );
    }
  }
  if (
    ["respond", "accept", "book", "withdraw", "decline"].includes(
      action.type,
    ) &&
    "shift" in action
  ) {
    const s = data.shifts.find((s) => s.id === action.shift);
    if (!s) throw new Error("This shift no longer exists.");
    const a = action as Extract<
      Action,
      { type: "respond" | "accept" | "book" | "withdraw" | "decline" }
    >;
    const talent = action.type === "book" ? a.talent! : a.actor;
    let r = data.responses.find((r) => r.shift === s.id && r.talent === talent);
    if (action.type === "withdraw" || action.type === "decline") {
      if (
        !r ||
        r.talent !== a.actor ||
        !["invited", "can-cover"].includes(r.status)
      )
        throw new Error(
          "This response is no longer waiting. View its current status.",
        );
      r.status = action.type === "withdraw" ? "withdrawn" : "declined";
      event(
        data,
        r,
        `${member(data, talent).name} ${r.status} before booking.`,
      );
      notify(
        data,
        s.venue,
        `${member(data, talent).name} ${r.status}`,
        shiftLabel(s),
        `shift/${s.id}`,
      );
    } else {
      if (
        s.status !== "open" ||
        s.days[0].from <= data.now ||
        bookedCount(data, s.id) >= s.capacity
      )
        throw new Error(
          s.status === "expired"
            ? "This shift has started and is closed."
            : "This shift has been filled or closed. You have not been booked.",
        );
      const t = member(data, talent);
      if (!t?.approved || t.side !== "talent")
        throw new Error("Choose an approved talent member.");
      if (conflict(data, talent, s.days))
        throw new Error(
          "No longer available — booked elsewhere for overlapping hours.",
        );
      if (action.type === "respond") {
        if (
          s.mode !== "post" ||
          !t.roles.some((role) => s.roles.includes(role))
        )
          throw new Error("This shift is for members in the selected roles.");
        if (
          r &&
          ["invited", "can-cover", "booked", "not-selected", "lapsed"].includes(
            r.status,
          )
        )
          throw new Error(
            "You already have a response for this shift. View its current status.",
          );
        if (r) {
          r.status = "can-cover";
          r.note = a.note || "";
        } else {
          r = {
            id: uid(),
            shift: s.id,
            talent,
            source: "response",
            status: "can-cover",
            note: a.note || "",
            chat: false,
          };
          data.responses.push(r);
        }
        notify(
          data,
          s.venue,
          `${t.name} can cover`,
          `${shiftLabel(s)} · Review the response and book when ready.`,
          `shift/${s.id}`,
        );
        notify(
          data,
          talent,
          `Response sent to ${member(data, s.venue).name}`,
          "You're not booked yet. We'll notify you when the venue books you.",
          `shift/${s.id}`,
        );
      } else {
        if (
          !r ||
          (action.type === "accept"
            ? r.status !== "invited" || r.talent !== a.actor
            : r.status !== "can-cover" || s.venue !== a.actor)
        )
          throw new Error("This response is no longer available to book.");
        r.status = "booked";
        r.chat = true;
        const b: Booking = {
          id: uid(),
          shift: s.id,
          talent,
          cancelled: false,
          bookedAt: data.now,
          outcomes: {},
        };
        data.bookings.unshift(b);
        event(
          data,
          r,
          "Booked. Both sides are committed to the dates, hours and pay shown above.",
        );
        for (const to of [talent, s.venue])
          notify(
            data,
            to,
            "Booking confirmed",
            `${t.name} · ${member(data, s.venue).name} · ${serviceLabel(s.days[0])}`,
            `booking/${b.id}`,
          );
        if (bookedCount(data, s.id) >= s.capacity) {
          s.status = "filled";
          closeWaiting(data, s, "This shift has been filled");
        }
        data.responses
          .filter(
            (o) =>
              o.talent === talent &&
              o.shift !== s.id &&
              ["invited", "can-cover"].includes(o.status) &&
              overlap(s.days, data.shifts.find((x) => x.id === o.shift)!.days),
          )
          .forEach((o) => {
            o.status = "lapsed";
            event(data, o, "No longer available — booked elsewhere.");
            notify(
              data,
              data.shifts.find((x) => x.id === o.shift)!.venue,
              "No longer available",
              `${t.name} now has an overlapping booking.`,
              `shift/${o.shift}`,
            );
            notify(
              data,
              talent,
              "Overlapping response lapsed",
              "Your other response is no longer available because you are booked then.",
              `shift/${o.shift}`,
            );
          });
      }
    }
  }
  if (action.type === "close") {
    const s = data.shifts.find((s) => s.id === action.shift)!;
    if (s.venue !== action.actor || s.status !== "open")
      throw new Error("This shift is already closed or filled.");
    s.status = "closed";
    closeWaiting(data, s, `Shift closed: ${action.reason}`);
  }
  if (action.type === "cancel") {
    const b = data.bookings.find((b) => b.id === action.booking)!;
    const s = data.shifts.find((s) => s.id === b.shift)!;
    if (
      ![s.venue, b.talent].includes(action.actor) ||
      b.cancelled ||
      bookingPast(data, b)
    )
      throw new Error(
        "This booking cannot be cancelled. Report an issue for past work.",
      );
    if (!action.reason.trim()) throw new Error("Choose a cancellation reason.");
    b.cancelled = true;
    b.reason = action.reason;
    b.by = action.actor;
    b.cancelledAt = data.now;
    const r = data.responses.find(
      (r) => r.shift === s.id && r.talent === b.talent,
    )!;
    r.status = "cancelled";
    event(
      data,
      r,
      `Booking cancelled by ${member(data, action.actor).name}: ${action.reason}. Completed services stay in history.`,
    );
    for (const to of [s.venue, b.talent])
      notify(
        data,
        to,
        "Booking cancelled",
        `${member(data, action.actor).name}: ${action.reason}`,
        `booking/${b.id}`,
      );
    // Cancellation releases the commitment, but never silently republishes availability.
    for (const day of s.days.filter((d) => d.to > data.now))
      data.availability = data.availability.filter(
        (a) => !(a.member === b.talent && a.date === day.date),
      );
    notify(
      data,
      "owner",
      "Cancellation to review",
      `${member(data, action.actor).name} cancelled ${shiftLabel(s)}${Date.parse(s.days[0].from) - Date.parse(data.now) < 86400000 ? " within 24 hours" : ""}.`,
      `booking/${b.id}`,
    );
  }
  if (action.type === "open-chat" || action.type === "message") {
    const r = data.responses.find((r) => r.id === action.response)!;
    const s = data.shifts.find((s) => s.id === r.shift)!;
    if (![r.talent, s.venue].includes(action.actor))
      throw new Error("This conversation is private.");
    if (!r.chat && action.actor !== s.venue)
      throw new Error(
        "The venue will open a conversation after your response.",
      );
    r.chat = true;
    if (action.type === "message") {
      if (!action.text.trim()) throw new Error("Write a message first.");
      data.messages.push({
        id: uid(),
        response: r.id,
        from: action.actor,
        text: action.text.trim(),
        time: data.now,
        system: false,
      });
      data.messageDrafts[`${action.actor}/${r.id}`] = "";
      notify(
        data,
        action.actor === r.talent ? s.venue : r.talent,
        `Message from ${member(data, action.actor).name}`,
        action.text.trim(),
        `chat/${r.id}`,
      );
    }
  }
  if (action.type === "availability") {
    if (!action.dates.length) throw new Error("Choose at least one date.");
    if (action.kind === "free")
      action.dates.forEach((date) => {
        if (action.start === "00:00" && action.end === "00:00") {
          londonInstant(date, action.start);
          londonInstant(datePlus(date, 1), action.end);
        } else
          makeDays({
            date,
            count: 1,
            start: action.start,
            end: action.end,
          } as ShiftDraft);
      });
    for (const date of action.dates) {
      data.availability = data.availability.filter(
        (a) => !(a.member === action.actor && a.date === date),
      );
      data.availability.push({
        member: action.actor,
        date,
        kind: action.kind,
        start: action.start,
        end: action.end,
      });
    }
  }
  if (action.type === "outcome") {
    const b = data.bookings.find((b) => b.id === action.booking)!;
    const s = data.shifts.find((s) => s.id === b.shift)!;
    if (![b.talent, s.venue].includes(action.actor))
      throw new Error("This booking is private.");
    b.outcomes[action.actor] = action.value;
    if (action.value !== "Yes, worked")
      notify(
        data,
        "owner",
        "Booking issue reported",
        `${member(data, action.actor).name}: ${action.value}`,
        `booking/${b.id}`,
      );
  }
  return data;
}
export function unreadChat(data: Data, actor: string, r: Response) {
  const messages = data.messages.filter((m) => m.response === r.id);
  const idx = messages.findIndex((m) => m.id === data.read[`${actor}/${r.id}`]);
  return messages.slice(idx + 1).some((m) => m.from !== actor);
}
