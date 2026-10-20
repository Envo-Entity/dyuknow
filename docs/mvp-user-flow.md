# Dyuknow: MVP user flow

Updated 20 October 2026. This replaces the earlier flow and the separate flowcharts. There is now one way to ask for cover and one way to answer.

Dyuknow is for cover: a service, a day, or up to two weeks. Pay is hourly, set by the venue, and paid by the venue directly. The app records every day worked so payments can run on it later.

## The one rule

> **Talent says yes. The venue books.** One exception: a booking request sent to one person for one place books when they accept.

There are two ways for a venue to ask, and they behave the same way:

| | Who it goes to | Talent taps | Venue taps |
| --- | --- | --- | --- |
| **Booking request** | The people the venue picked (one or several) | **I can do this** (and picks days); **Accept** when it went only to them, for one place | **Book** (nothing to tap after an Accept) |
| **Job post** | Everyone in the position | **I can do this** (and picks days) | **Book** |

In the model this is one object, a `Shift`, with `mode: "request"` or `mode: "post"`. Both use the same form, the same card, the same answer screen and the same Book button.

- **Saying yes reserves nothing.** Someone can say yes to two clashing shifts. Whichever venue books first wins; the other yes drops off and that venue sees "Booked elsewhere".
- **The venue makes the final pick** whenever there's a choice: a job post, or a request to several people or for several places. The talent sees "Waiting for Spruce to book you". When the venue already chose one person for one place, their **Accept** is the booking.
- **Sending to several people is normal.** If one person declines, nobody has wasted time waiting. Everyone who says yes is listed, and the venue picks.
- **No revising.** If the terms don't work, the talent declines or says so in chat, and the venue taps **Send new request**, which opens the form filled in from the old one. There is no "ask for changes" and no "replaced" state. A request everyone declined closes itself and shows as "Declined".
- **Chat never changes terms.** The card in the conversation is the source of truth.

## Words

| Word | Meaning |
| --- | --- |
| **Booking request** | A venue asks specific people. |
| **Job post** | A venue asks everyone in a position. |
| **I can do this** | Talent's yes, to either. |
| **Book** | The venue's pick. This is what makes a booking. |
| **Accept** | Talent's yes to a request sent only to them, for one place. It books them. |
| **Cancel days** | Undo some or all booked days. Needs a reason and tells the other side. |
| **Confirm hours** | After a day ends, the venue confirms the hours worked. |

## Venue

### Ask for cover: a booking request

1. **Book** opens with a date strip (two weeks at a time, up to eight weeks ahead) and the hours: Lunch, Dinner, Late, or any From–To. Pick up to 14 dates with the same hours.
2. Tap a team (Kitchen, Pastry, Bar, Sommelier, Floor). The people in that team are listed, free then first, then people who worked here. Each card shows free or not for those hours, minimum pay, skills, and "Worked with you".
3. Tap **Add to request** on the people you want. **Send booking request to …** stays pinned at the bottom of the screen.
4. The form opens already filled in: **To** (the people, removable), **Position**, **When**, **Pay** (£/hour, from the venue's last ask in that team), **People needed** (per day), and **Note** (from the venue's last ask).
5. Send. Each person gets the request as a card in their conversation with the venue, and a text.

A booking request can also start from a person's profile or from a conversation (**Send booking request**). It opens the same form. Sent from a conversation, it returns to the conversation, where the new card confirms it.

### Ask for cover: a job post

**Post a job** (the black button in the sidebar; the round + on phones) → pick a team → the same form, with **To: everyone in the position**. Posting texts everyone in those positions.

### Review and book

The shift page shows who said yes, day by day:

- each day, who's booked, how many more are needed, and who can do it, with **Book** next to each name;
- people who said yes, split into "every day" and "some days" when the shift runs several days;
- everyone else it went to, with **Message**.

Booking picks from the days that person said yes to. The venue can book different people on different days, and booking more days for the same person adds to their one booking. When every day is full, everyone still waiting is told it's filled.

The ⋯ menu has **Send to more people** (the same request, to more people) and **Close**. When someone declines a request, their card and the chat card offer **Send new request**.

**Bookings**, top to bottom: **Needs you** (yeses to book, hours to confirm), **Upcoming** (booked people), **Waiting for replies** (open asks, each labelled "Job post" or "Request · names"), and **Past and cancelled**.

### After booking

- **Cancel days.** Either side can cancel any days that haven't started, with a reason. The other days stay booked. Both calendars free up, and the shift reopens for those days: "Poppy cancelled · Fri 9 needs 1 person".
- **Confirm hours.** After each day ends it shows under **Bookings → Confirm hours**. The venue confirms the hours (pre-filled with the planned hours; change them if the person stayed late), or marks that they didn't show. If the venue does nothing, the day confirms itself at the planned hours 48 hours after it ends.
- Every booking shows its **Days**: booked, waiting for hours, worked (with hours and pay), didn't show, or cancelled (by whom, and why). This is the record payments will use.
- **Book again** opens a booking request to the same person.

## Talent

**Shifts** (home), top to bottom:

1. **Upcoming shifts.** Next bookings, each with address, directions and calendar.
2. **Booking requests.** Requests waiting for an answer.
3. **Waiting to hear.** Things they said yes to that the venue hasn't booked yet.
4. **Open jobs.** Job posts for their positions.

Opening any of them shows the same screen: venue, position, dates, hours, pay, note, and day-by-day status when it runs several days. The talent taps **I can do this** (or **Accept** on a request sent only to them, for one place). For one day that's it; for several they tick the days they can do (days they marked not free start unticked). On a booking request they can also **Decline**. Before they're booked they can **Withdraw**. One answer per shift: anything else goes in chat.

**Availability** is the second tab: two weeks at a time, up to eight weeks ahead. Tick one or more days and set them free all day, free from–to, or not free. Availability guides venues ("Free then", "Not free then") but doesn't block them. Only a booking blocks time.

## Messages

One conversation per venue and talent pair. Booking requests, yeses, bookings and cancellations all appear in it as cards or status lines. Either side can start it. The venue's header has **Send booking request**.

## Rules the model enforces

1. **Only the venue books**, and only from days the person said yes to that are still open. The one exception is an Accept on a request sent only to that person, for one place.
2. **No double booking.** When someone is booked, the clashing days drop out of their other yeses. A yes with no days left lapses, and that venue sees "Booked elsewhere".
3. **A day closes when it starts.** It can't be said yes to, booked or cancelled after that. The shift expires when no future day still needs someone.
4. **Terms don't change after sending.** To change them, close and send a new request.
5. **A request everyone declined closes itself** and moves to Past as "Declined".
6. **A cancelled day reopens the shift** for that day and drops out of that person's yes, so they aren't offered back to the venue unless they say yes again.
7. **Hours are confirmed per day**, only by the venue, only after the day ends, and only once. Unconfirmed days confirm themselves after 48 hours.

## Flows

```mermaid
flowchart TD
    A[Venue picks date and team] --> B[Ticks people → Send booking request]
    P[Venue: Post a job] --> F
    B --> F[Same form: position, when, pay, people, note]
    F -->|request| R[Card to chosen people]
    F -->|job post| J[Texts everyone in the position]
    R --> Y[Talent: I can do this · picks days]
    R -->|one person, one place| AC[Talent: Accept]
    AC --> BK
    J --> Y
    R --> D[Talent: Decline]
    Y --> K[Venue: Book · picks days and people]
    K --> BK[Booked: one record per day]
    BK --> C[Cancel days → shift reopens for them]
    BK --> H[Day ends → venue confirms hours or no-show]
    H -->|48h with no answer| W[Confirmed at planned hours]
```

```mermaid
stateDiagram-v2
    [*] --> invited: booking request sent
    [*] --> can_cover: says yes to a job post
    invited --> can_cover: I can do this
    invited --> booked: Accept (only them, one place)
    invited --> declined: Decline
    can_cover --> booked: venue books
    can_cover --> withdrawn: Withdraw
    can_cover --> not_selected: days filled by others
    can_cover --> lapsed: booked elsewhere
    booked --> cancelled: every day cancelled
```

## What was removed, and why

| Removed | Why |
| --- | --- |
| Booking cards in chat as a separate object (`Offer`) | They did the same job as an invite. A booking request is now a shift sent to chosen people. |
| "Accept and book" for every request | Kept only where the venue has already chosen: one person, one place. Everywhere else the venue picks. |
| Same person for all days | A lock on yeses and bookings few asks need. The yes card says "Can do all 3 days"; the venue books that person for all of them. |
| Adding days after a yes, a note with a yes | Second answer flows for rare cases. Chat covers both. |
| Other-role jobs, the Venues tab, other teams on team pages | Lists of things the user can't act on. |
| Venue covers, team size, vacancies, known for, teams needed, default rates, dress code, uniform, staff meal, website; email; custom skills | Nobody decides on them. Pay and note now carry over from the venue's last ask. |
| Payments, quiet hours, replies switch, help form | Venues pay talent directly; the switches did nothing; Help keeps a phone number and email. |
| Ask for changes, revised cards | Decline or chat, then the venue sends a new request. |
| Invite specific people from the post form | The post form only posts. Picking people starts from the team list. |
| Edit and resend, drafts, text everyone again | Close and send a new request. |
| Owner workspace, approvals in the demo, owner fallback | Dyuknow vets people outside the app. Real approval stays in database administration. |
| Per-shift chats | One conversation per pair. |
| Private "did it go ahead?" outcomes | Replaced by per-day hours confirmation. |

## Questions for the founder

These are the facts the flow is built on. Each one is a guess until confirmed:

1. How far ahead do venues usually know they need cover? The cap is eight weeks.
2. Is multi-day cover usually back-to-back days or scattered ones? The cap is 14 days per ask.
3. When does a venue insist on the same person for every day? Does it differ between kitchen and front of house?
4. How often do shifts run over, and who agrees the final hours?
5. Should late cancellations (under 24 hours) be counted against someone?
6. Is the hourly rate ever different on different days of the same ask, such as weekends?
7. Day to day, does a venue start from "I need a CDP on Sunday" or "I need Poppy"?
