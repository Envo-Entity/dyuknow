# How the MVP preview works

These charts describe what is built on `MVP-preview` today, from each person's point of view. The product behaviour follows [mvp-user-flow.md](mvp-user-flow.md). Everything runs in this browser's sample world: no real accounts, SMS, payments or backend.

## The rules in one place

- **Two yeses make a booking. Whoever says yes second confirms it.**
  - Posted shift: talent says *I can cover this*, then the venue taps *Book*.
  - Invitation: the venue sends it with full terms, then talent taps *Accept and book*.
- **Nothing ever books automatically.** On a posted shift, the venue always makes the final call.
- **A multi-day shift is a set of days, and the yeses are per day.**
  - Each day has its own start and end. Talent ticks the days they can do.
  - A booking covers only days both sides said yes to. The venue picks which of a person's offered days to book, never more than they offered.
  - The venue can book different people on different days. Adding more of the same person's days extends their booking rather than creating a second one.
  - Days nobody has covered stay open for someone else.
- **"Each person must cover every day" is optional.** When posting more than one day, the venue can switch it on (off by default). With "2 people needed each day" it means two people, each covering every day.
- **Talent can add days later**, even after being booked for some of them.
- **A cancellation reopens the shift** for the future days that now need someone.
- **A shift closes day by day:** a day can't be taken once it has started, and the shift closes when no day that still needs someone is left.
- **Buttons always name the days:** "Offer 2 of 3 days", "Offer 1 day (Thu only)", "Book Theo · all 3 days". Never a bare "Apply".
- **Only a booking reserves time.** Saying you can cover, being invited or chatting reserves nothing. When someone is booked, the clashing days drop out of their other answers.
- **Terms are frozen once sent.** Role, dates, hours and pay can't change. The note can change freely. To change the terms, the venue resends the shift as a new one.
- **Chat never changes terms.** The pinned card at the top of a conversation is the source of truth.

## What each profile shows

Every item comes from a field in [data-model.md](data-model.md); nothing else appears.

- **A talent, as a venue sees them:** photo or initials, name, positions, postcode area ("TW9"), "Worked with you" (only from past bookings), up to 3 skills, bio (first 3 lines on cards), and for a shift the days offered and their note. The full profile adds availability.
- **A venue, as talent see it:** photo, name, postcode area, "Restaurant · Seafood", "30–60 covers · team of 12", "known for" chips, website and Instagram, bio, open shifts. The full address and on-site contact come only once booked.
- **New shifts pre-fill** pay from the venue's kitchen or front-of-house rate, and the note from dress code, uniform and staff meal.
- **Owner only:** a venue's vacancies in a typical week.

## Where things live

| Venue tab | What's there | Talent tab | What's there |
| --- | --- | --- | --- |
| **Book** | Your open shifts with live status, the role tiles, who's coming up | **Shifts** | Next booking, invitations, waiting to hear, shifts for your roles; a Venues toggle |
| **Bookings** | Needs you · Open · Coming up · Past and cancelled (collapsed) | **My shifts** | When you're free (14 days), Coming up, Invited you, Waiting to hear, Past and closed (collapsed) |
| **Messages** | One conversation per shift and person | **Messages** | Same |
| **Profile** | Venue details and the defaults used on new shifts | **Profile** | Roles, skills, bio and shift alerts |

- **Signals:** a red dot on Messages for unread messages. A count on Bookings for responses waiting for the venue, and on My shifts for invitations waiting for talent.
- **No notifications page.** In the real product, texts do that job.
- **Phones:** the tab bar hides on task screens (posting, a shift, a booking, a chat), so the main button stays in reach.

## 1. Joining

```mermaid
flowchart TD
    A["Welcome screen"] --> B{"How do you come in?"}
    B --> C["Phone number + text code"]
    C --> D{"Does a preloaded profile have this number?"}
    D -->|"Yes"| CLAIM["Is this you? Confirm the profile"]
    D -->|"No"| SETUP["Short setup"]
    SETUP --> SV["Venue: name, address, on-site contact, usual rate, default note"]
    SETUP --> ST["Talent: roles, preset or custom skills, area"]
    ST --> AV["When are you free this week? Pick days and day or evening, or skip"]
    SV --> WAIT["Waiting for approval: profile can be edited, nothing else yet"]
    AV --> WAIT
    WAIT --> OWN["Owner approves"]
    OWN --> IN["Text: you're in"]
    IN --> HOME["Venue lands on Book, talent on Shifts"]
    CLAIM --> HOME
```

A waiting member who opens a shift link can read its terms but can't respond or accept until approved.

## 2. Venue posts a shift

One screen. Tapping a role tile opens it with the team already chosen.

```mermaid
flowchart TD
    A["Book: tap a role tile, e.g. Kitchen"] --> B["Who: grade chips with member counts; last time's grades preselected"]
    B --> C["When: Today, Tomorrow or Pick dates (any of the next 14 days, up to 7)"]
    C --> D["One start and end time: same hours each day"]
    D --> T{"More than one day?"}
    T -->|"Yes"| TOG["Each person must cover every day: off by default; People needed each day"]
    T -->|"No"| E
    TOG --> E["Pay per hour and people needed, prefilled; note from venue defaults"]
    E --> F{"Already an open shift for these roles at this time?"}
    F -->|"Yes"| WARN["Warning with a link to it; venue can still send"]
    F -->|"No"| G{"Anyone in these roles?"}
    WARN --> G
    G -->|"Yes"| H["Post shift: texts Poppy and Theo; you review who can cover, then book"]
    G -->|"No"| I["Ask Dyuknow to find someone"]
    H --> J["Matching talent get a text listing every day; shift page opens"]
    I --> K["Owner is alerted; shift stays open"]
    G -->|"Yes"| L["Invite specific people: accepting books them straight away; see chart 5"]
```

- **Who gets texted:** approved talent who have one of the chosen grades. Talent who set alerts to *Today and tomorrow only* hear only about shifts starting by tomorrow.
- **Drafts:** saved only after a real change. Home shows "Unsent changes to your CDP shift" or "Unsent CDP shift" with Continue or Discard. Opening an edit and backing out leaves nothing behind.
- **Validation:** an overnight shift shows both dates. A start time in the past is refused. Pay below £12.71 an hour shows a warning.

## 3. Talent says "I can cover this"

Talent arrive from the text link, or from **Shifts**. Shift cards lead with the venue's name and photo, the dates ("Thu 8–Sat 10 Oct · 17:00–23:00") and "3 days needed". Shifts for other roles sit behind one button. Hidden from the feed: shifts that clash with a booking on every day, and one-person-for-every-day shifts that clash on any day.

```mermaid
flowchart TD
    A["Shift page: venue, role, dates, hours, pay, about £ a day, note, area"] --> B{"What's the situation?"}
    B -->|"Free for at least one open day"| C["I can cover this"]
    B -->|"Booked elsewhere on every day"| X["You're booked at Harper Privé then"]
    B -->|"Each person covers every day, but busy on one"| Z["Needs each person to cover all 3 days. You're at Harper Privé on Fri 9."]
    B -->|"Not one of my roles"| Y["This shift is for CDP, which isn't on your profile"]
    C --> S{"Sheet: which days?"}
    S -->|"Normal multi-day shift"| TICK["Tick days. Covered or booked-elsewhere days are greyed out. Days marked Not free start unticked."]
    S -->|"Each person covers every day"| FIXED["All days fixed"]
    S -->|"Single day"| ONE["Just the note"]
    TICK --> LBL["Offer all 3 days · Offer 2 of 3 days · Offer 1 day (Thu only)"]
    FIXED --> LBL2["Offer all 3 days"]
    ONE --> LBL3["Send to Spruce"]
    LBL --> W["Waiting for Harper Privé · Sun 4, Mon 5 Oct. You're not booked yet."]
    LBL2 --> W
    LBL3 --> W
    W --> WD["Withdraw: venue sees Withdrew"]
    W --> M["Message, once the venue opens a conversation"]
    W --> BK["Venue books some or all of those days: You're booked at Harper Privé"]
    BK --> MORE["You're booked Sun 4. Mon 5 still needs someone. Offer Mon 5"]
    MORE --> ADD["Sheet shows only days not yet offered; venue sees can also cover"]
    W --> MORE2["Offer more days, while still waiting"]
    MORE2 --> ADD
    W --> NO["Others fill every day offered: The days you offered have been covered"]
```

"Not free" comes from the talent's own calendar (chart 7). It's a hint, not a block, because only a booking reserves time.

## 4. Venue reviews and books

The shift page is written for the venue. There is no stock photo, and edit and close live under a ⋯ menu. On multi-day shifts the **day tracker** comes first.

```mermaid
flowchart TD
    A["Shift page: CDP · Sun 4–Tue 6 Oct · £24/h · 1 person"] --> TR["Day tracker: one row per day"]
    TR --> ROW["Sun 4 Oct · Open · 2 can cover: Poppy (Sun only), Theo (all 3 days)"]
    ROW --> PER["Book Poppy or Book Theo for that day"]
    A --> R["Response cards: photo, positions, postcode area, Worked with you, up to 3 skills, bio, note, Offered all 3 days (Sun filled)"]
    R --> FULL["Book Theo · all 3 days, or · 2 days"]
    R --> MSG["Message: chat with Book pinned at the top"]
    MSG --> SHEET
    PER --> SHEET["Confirm sheet: tick which offered, open days to book"]
    FULL --> SHEET
    SHEET --> CHECK{"Still open, not started, days still free, no clash elsewhere?"}
    CHECK -->|"No"| X["Clear reason; nothing booked"]
    CHECK -->|"Yes"| OK{"Already booked on this shift?"}
    OK -->|"No"| NEW["New booking; talent texted You're booked"]
    OK -->|"Yes"| ADD["Days added to the same booking; talent texted Harper Privé added Tue"]
    NEW --> COV{"Every day fully covered?"}
    ADD --> COV
    COV -->|"Yes"| FILLED["Filled: everyone still waiting is told"]
    COV -->|"No"| OPEN["Other days stay open; tracker updates"]
    OPEN --> TOLD["Anyone whose offered days are now all covered is told"]
    NEW --> TRIM["The person's other answers elsewhere lose the clashing days; any left with none lapse"]
```

- **"Worked with you"** comes only from recorded work: a past, uncancelled booking at that venue that the venue didn't report as a no-show or problem. Never from a bio or a skill.
- **Mix and match:** for example, Poppy on Sun, then Theo on Mon, then Theo again on Tue. Theo ends up with one booking for Mon and Tue.
- **On a one-person-for-every-day shift:** the tracker shows who's booked but has no per-day Book buttons, and the confirm sheet books every day.
- **Status line:** talks in people per day ("Mon 5, Tue 6 each need 1 more person"), never "days covered".
- **When nobody can be booked:** before anyone is booked it says "No replies yet" with Invite more people and Ask Dyuknow to help. Once someone is or was booked it says "Find cover for Tue 6" with Text everyone again and Invite people.

## 5. Inviting specific people

From **Invite specific people** on the posting screen ("You choose who. Accepting books them straight away."), or **Invite more people** on an open shift.

```mermaid
flowchart TD
    A["Pick list: people you've worked with first, then free then, then everyone else"] --> B["Each shows Worked with you, Free then, Free 2 of 3 days, or Booked elsewhere then"]
    B --> C["Select one or more; booked-elsewhere people can't be picked"]
    C --> D{"More people picked than places?"}
    D -->|"Yes"| N["Note: the first to accept is booked; everyone else is told it's filled"]
    D -->|"No"| SEND["Invite Poppy, or Invite 3 people"]
    N --> SEND
    SEND --> T["Talent: text; invitation pinned on Shifts"]
    T --> Q{"Talent's answer"}
    Q -->|"Message"| CHAT["Chat; come back to decide"]
    CHAT --> Q
    Q -->|"Decline"| DEC["Venue sees Declined"]
    Q -->|"Accept and book"| ACC{"Place left on every open day, no clash?"}
    ACC -->|"Yes"| BOOKED["Booked straight away for all open days; venue texted"]
    ACC -->|"No"| GONE["This shift has been filled, or you're booked elsewhere"]
    Q -->|"I can do some days: multi-day, not one-person-for-every-day"| SOME["Becomes a normal response with ticked days"]
    SOME --> WAITV["Waits for the venue to book: chart 4"]
```

The invitation screen and its chat show the one role the person was invited for, not the full list of grades.

## 6. Talking

```mermaid
flowchart TD
    A["Talent responds to a posted shift"] --> V["Venue taps Message on the response"]
    I["Venue invites someone"] --> OPEN["Conversation open from the start"]
    BK["Booked"] --> OPEN
    V --> OPEN
    OPEN --> PIN["Pinned card: role, days, hours, pay and the next action"]
    PIN --> PV["Venue: Book Poppy, while Poppy is waiting"]
    PIN --> PT["Talent: Accept or decline, while invited"]
    PIN --> PB["Either: Booked · details"]
    OPEN --> SEND["Send a message"]
    SEND --> DOT["Other side: red dot on Messages, and a text"]
    DOT --> READ["Opening the thread clears the dot"]
    READ --> STILL["Any booking decision stays pending until someone acts"]
```

- **Who can start a conversation:** talent can't message a venue first, and nobody can message from a venue or talent profile.
- **What lights the dot:** status lines in a thread ("Booked for Sun 4, Mon 5 Oct") don't count as unread messages.
- **Order:** conversations are listed with the most recent first.

## 7. Finding work and setting availability

```mermaid
flowchart TD
    T["Shifts tab"] --> NEXT["Next booking card, if any"]
    T --> INV["Invited you"]
    T --> WAIT["Waiting to hear"]
    T --> FEED["Shifts for you: your roles, soonest first, no filters"]
    FEED --> OTHER["Show shifts in other roles"]
    T --> VEN["Venues toggle: every member venue and its open shifts"]
    T --> FREE["When I'm free"]
    MS["My shifts: 14-day strip, booked days show the venue"] --> FREE
    FREE --> DAY["Pick a day: Free all day, Free from–to, or Not free"]
    DAY --> COPY["Copy to other dates, then save"]
    COPY --> USE["Venues see Free then when choosing who to invite"]
```

- **Not set:** blank days mean the talent hasn't said either way.
- **What availability does:** it helps venues choose who to invite. It doesn't reserve time, and it doesn't control who gets shift texts; alerts follow roles.
- **Bookings win:** a booked day stays blocked whatever the availability says.
- **Not free days:** they start unticked when the talent offers on a multi-day shift (chart 3).

## 8. After booking

Each side gets a booking screen written for them.

```mermaid
flowchart TD
    B["Booked"] --> VV["Venue: Poppy's coming on Sun 4 Oct at 17:00, Poppy's phone, the days, the arrival details Poppy has"]
    B --> TV["Talent: You're booked at Harper Privé, days, pay, address with Directions, on-site contact, note"]
    VV --> ACT["Message · Call · Add to calendar"]
    TV --> ACT
    B --> REM["Talent reminder text: 18:00 the day before, or 2 hours before if booked the same day"]
    B --> NEXT{"What happens next?"}
    NEXT -->|"A problem"| REP["Report a problem: only Dyuknow sees it; booking stays"]
    NEXT -->|"Plans change"| CAN["Cancel booking: choose a reason"]
    CAN --> TOLD["Other side texted; owner told; history kept"]
    TOLD --> T2["Talent: those hours aren't put back as free automatically"]
    TOLD --> REOPEN["Shift reopens for the future days: Theo cancelled · Tue 6 needs 1 more person"]
    REOPEN --> V2["Venue: Text everyone again, or Invite people; people told filled can offer again"]
    NEXT -->|"Service ends"| PAST["Past booking"]
    PAST --> ASK["Did it go ahead? Yes, No-show or There was a problem; only Dyuknow sees it"]
    ASK -->|"Venue reports no-show or problem"| V3["Venue: Find a replacement opens a new prefilled shift"]
    PAST --> AGAIN["Venue: Book Poppy again, a prefilled invite needing only new dates"]
    V3 --> NEWS["New shift; the original booking stays as its own record"]
```

- **Cancelling mid-way:** if a multi-day booking has already started, the cancel sheet lists only the remaining days, and the worked days stay in history.
- **Payment** is arranged directly between venue and talent.

## 9. Changing, closing or getting help with an open shift

```mermaid
flowchart TD
    S["Venue's open shift, ⋯ menu"] --> NOTE["Edit note: terms stay the same"]
    S --> MORE["Invite more people: chart 5"]
    S --> CHG{"Change time, pay or role"}
    CHG -->|"Nobody booked yet"| RESEND["Opens the form prefilled; sending closes the old shift and tells anyone waiting; backing out unchanged saves nothing"]
    CHG -->|"Someone booked"| LOCK["Greyed out: cancel the booking and post again instead"]
    S --> CLOSE["Close shift: choose a reason; anyone waiting is told; booked people stay booked"]
    S --> HELP["Ask Dyuknow to help: owner alerted"]
    S --> SAME["Same-day shift, no replies after 30 minutes: owner and venue alerted"]
    S --> START["Each day closes when it starts; when no day that needs someone is left, the shift closes and anyone waiting is told"]
    START --> OLD["Old links show the current state and can't book"]
```

A shift posted for a role with no members alerts the owner straight away.

## 10. Preview-only tools

These exist only so one person can try both sides. They are not part of the product. **Enter as Spruce** and **Enter as Poppy** on the welcome screen skip sign-in; **Try phone sign-in** shows the real joining path from chart 1 (demo code `123456`).

```mermaid
flowchart TD
    P["Green strip at the top"] --> TX["Texts: the SMS each account would have received"]
    P --> WT["Walkthrough: click-by-click stories"]
    P --> PC["Preview controls"]
    PC --> OFF["Go offline or Fail next save: nothing pretends to succeed; drafts kept"]
    PC --> CLOCK["Advance 30 minutes, jump to a shift's start, or finish a booking"]
    PC --> RIVAL["Another person fills this shift, or books me elsewhere"]
    PC --> RESET["Reset stories: back to the starting sample world"]
    SW["Switch account, top right"] --> ANY["Play any venue, talent or the owner"]
```

The clock starts at 1 October 2026, 10:00 London. Two tabs in the same browser share one sample world; separate browsers don't. For step-by-step stories, see [MVP-preview-walkthrough.md](MVP-preview-walkthrough.md) or the in-app Walkthrough.
