# How the MVP preview can be used

These charts describe the frontend currently implemented on `MVP-preview`. All people, bookings, messages and notifications belong to the browser-local sample world. SMS, real authentication, payments and backend services are not involved.

Two paths confirm a booking: **posted shift → talent responds → venue books**, or **personal invitation → talent accepts**. A response and a message do not reserve time.

## 1. Entry, joining and profiles

You can enter immediately as a sample member, claim a preloaded profile with demo code `123456`, or try the optional joining and owner-approval journey.

```mermaid
flowchart TD
    A["Welcome screen"] --> B{"How do you want to enter?"}
    B --> V["Venue: Enter as Spruce"]
    B --> T["Talent: Enter as Poppy or choose Camille"]
    B --> C["Try phone sign-in / claim a profile"]
    C --> OTP["Sample existing phone + code 123456"]
    OTP --> CLAIM["Confirm the preloaded profile"]
    B --> J["Explore new-member setup"]
    J --> JV["Venue: profile, address, contact, rate and preparation defaults"]
    J --> JT["Talent: role, predefined/custom skills and area"]
    JT --> AV["Choose first-week dates and day/evening hours, or skip"]
    JV --> P["Waiting for approval"]
    AV --> P
    P --> READ["Edit profile and read linked shift terms"]
    P --> O["Owner: Members → Approve"]
    O --> N["Approval notification"]
    N --> W["Member workspace"]
    V --> W
    T --> W
    CLAIM --> W
    W --> EDIT["Profile: edit details, roles/skills or venue defaults and alerts"]
    W --> SWITCH["Switch account to play the other side"]
    W --> OUT["Sign out; local activity remains saved"]
```

## 2. Post a shift and book a respondent

This is the main venue journey. Talent says they can cover; the venue decides whom to book. A request can span 1–7 consecutive dates with the same hours and need 1–5 people. Each person commits to every listed service.

```mermaid
flowchart TD
    subgraph V["Venue"]
        V1["Book → choose team and acceptable roles"] --> V2["Set dates, hours and people needed"]
        V2 --> V3["Review pay and preparation terms"]
        V3 --> V4["Send to matching talent"]
        V5["Open responses from Notifications or Bookings"] --> V6{"Venue decision"}
        V6 -->|"Discuss first"| VM["Message respondent"]
        VM --> V6
        V6 -->|"Confirm person"| VB["Book"]
    end
    subgraph T["Talent"]
        T1["Notification or browse open shifts"] --> T2["Read all dates, hours, pay and work area"]
        T2 --> T3["I can cover this: confirm travel and all services"]
        T3 --> T4["Response sent: waiting, not booked"]
        T4 -->|"Change of plans"| TW["Withdraw response; venue notified"]
    end
    V4 --> T1
    T4 --> V5
    VB --> CHECK{"Still open, place available and no booking conflict?"}
    CHECK -->|"Yes"| B["Shared booking confirmed; both sides notified"]
    CHECK -->|"No"| X["Show current status; no booking created"]
    B --> CAP{"All required places booked?"}
    CAP -->|"No"| MORE["Keep request open for remaining people"]
    MORE --> V5
    CAP -->|"Yes"| FULL["Filled; remaining candidates notified"]
```

## 3. Invite specific people

The venue has already offered the full terms. Accepting is talent's final yes, so there is no second venue confirmation. Invitations can also be added to an existing posted shift and share its remaining capacity.

```mermaid
flowchart TD
    V["Venue prepares and reviews shift terms"] --> CH["Choose who to invite"]
    EXIST["Existing open request → Invite specific people"] --> CH
    CH --> LIST["Past collaborators first, then free for every service, then availability not set"]
    LIST --> SELECT["Review profiles and select one or several people"]
    SELECT --> SEND["Send personal invitations"]
    SEND --> T["Talent opens invitation from home or Notifications"]
    T --> D{"Talent choice"}
    D -->|"Ask a question"| M["Message venue; return to decision"]
    M --> D
    D -->|"Decline"| NO["Venue notified; no booking"]
    D -->|"Accept and confirm travel"| C{"Place remains and no conflict?"}
    C -->|"Yes"| B["Immediately booked; both schedules updated"]
    C -->|"No"| F["Filled, closed or unavailable; no booking"]
    B --> K{"Capacity reached?"}
    K -->|"Yes"| CLOSED["Other waiting invitations are closed"]
    K -->|"No"| OPEN["Remaining places stay open"]
```

For one place and several invitees, the first valid acceptance wins. Skills describe experience; the preview does not create a match score.

## 4. Browse work and publish availability

Talent can find shifts through alerts, filters or venue pages. Availability helps discovery and venue shortlisting; it does not reserve time or stop role alerts by itself. Talent can separately change their role-alert preference in Profile.

```mermaid
flowchart TD
    T["Talent: Shifts"] --> S["Your roles / All roles"]
    S --> FILTER["Filter by role, date, area, pay or published availability"]
    FILTER --> DETAIL["Open shift details"]
    T --> VENUES["Venues → approved venue profile → open shifts"]
    VENUES --> DETAIL
    DETAIL --> DECIDE["Respond to a post or decide on an invitation"]
    T --> A["Update availability"]
    HUB["My shifts: 14-day strip with booked venue labels"] --> A
    NUDGE["Weekly availability nudge"] --> A
    A --> DAY["Select a date"]
    DAY --> MODE{"Availability"}
    MODE --> FREE["Free all day"]
    MODE --> HOURS["Free from–to"]
    MODE --> NO["Not free"]
    FREE --> COPY["Optionally copy to other chosen dates"]
    HOURS --> COPY
    NO --> COPY
    COPY --> SAVE["Save published availability"]
    SAVE --> SHORT["Venue invitation shortlist uses this information"]
    HUB --> BOOKED["Booked interval → open its booking"]
```

Blank dates mean **Not set**. Confirmed bookings block overlapping commitments even when availability was published. Overnight shifts show both calendar dates; times use Europe/London.

## 5. Talk before or after booking

Messaging is tied to a particular request and person. There is no cold-message action in the venue directory or talent profiles.

```mermaid
flowchart TD
    R["Talent responds to a posted shift"] --> V["Venue opens Message beside the response"]
    I["Venue sends a personal invitation"] --> IT["Either participant can message before acceptance"]
    B["Confirmed booking"] --> BM["Either participant opens Message"]
    V --> THREAD["Shared thread with pinned shift terms"]
    IT --> THREAD
    BM --> THREAD
    THREAD --> SEND["Send a message"]
    SEND --> NOTICE["Other participant gets notification and unread dot"]
    NOTICE --> READ["Other participant opens Messages and reads/replies"]
    READ --> THREAD
    READ --> CLEAR["Unread dot clears for that thread"]
    CLEAR --> DECISION["Pending booking or invitation decision stays pending"]
```

Messages do not change agreed dates, hours or pay. You switch accounts to write both sides; the preview does not invent automatic replies.

## 6. Work, cancel, replace and book again

Both participants see the same confirmed booking, arrival details and conversation. Either can cancel with a reason; issues and attendance reports go privately to the owner.

```mermaid
flowchart TD
    B["Confirmed booking on both schedules"] --> ARR["Address, on-site contact, preparation, Directions and Add to calendar"]
    B --> REM["In-app reminder before service"]
    B --> ACT{"What happens next?"}
    ACT -->|"Service ends"| PAST["Past booking; attendance not assumed"]
    PAST --> REPORT{"Each side reports privately"}
    REPORT --> YES["Yes, worked"]
    REPORT --> NS["No-show or issue → owner notified"]
    ACT -->|"Running late or another issue"| ISSUE["Private report to owner; booking remains"]
    ACT -->|"Venue or talent cancels"| WHY["Choose reason and confirm affected services"]
    WHY --> CANCEL["Other side notified; cancelled history retained"]
    CANCEL --> TAL["Talent can manually reopen availability"]
    CANCEL --> REP["Venue: Find a replacement when future services remain"]
    NS --> OWN{"Venue has submitted its own issue/no-show report?"}
    ISSUE --> OWN
    OWN -->|"Yes"| REP2["Venue: Find a replacement after report"]
    OWN -->|"No"| HELP["Owner receives talent report; booking remains"]
    REP --> NEW["Review prefilled terms and valid future dates → new request"]
    REP2 --> NEW
    NEW --> FLOW["Post for responses or invite someone → new booking"]
    YES --> AGAIN["Venue: Book this talent again"]
    PAST --> AGAIN
    AGAIN --> INV["Previous role, hours and pay; choose new dates → personal invitation"]
```

Replacement preserves the original booking and report. Cancellation does not silently reopen the original request or republish talent availability. Completed services remain in history. Payment is arranged directly between venue and talent.

## 7. Change an open request or handle missing cover

The venue can revise an unbooked request or close remaining places. The owner is the fallback for missing supply and unanswered same-day requests.

```mermaid
flowchart TD
    S["Venue's open request"] --> ACTION{"What needs to change?"}
    ACTION --> NOTE["Edit preparation note; agreed role, dates, hours and pay stay"]
    ACTION --> EDIT{"Change role, dates, hours or pay?"}
    EDIT --> CHECK{"Anyone already booked?"}
    CHECK -->|"No"| RESEND["Edit and resend: close old request, notify candidates, create new request"]
    CHECK -->|"Yes"| LOCK["Terms cannot be edited in place"]
    ACTION --> CLOSE["Close unfilled places with a reason"]
    CLOSE --> KEEP["Notify waiting people; keep confirmed bookings"]
    S --> ZERO["No matching members → ask owner for cover"]
    S --> SILENT["Same-day request: no responses after 30 minutes"]
    ZERO --> OWNER["Owner and venue receive help notifications"]
    SILENT --> OWNER
    OWNER --> OV["Owner inspects shift, members and bookings"]
    S --> START["First service starts"]
    START --> EXPIRE["Unfilled places expire; waiting people notified"]
    EXPIRE --> OLD["Old links display current status and cannot book"]
```

Owner inspection also includes cancellations and private issue reports. The preview generates the help notice; it does not simulate an external phone call or create an automatic replacement worker.

## 8. Explore failures, conflicts and time in the preview

These controls let you experience events that would otherwise require another person or waiting. They operate only on the sample world.

```mermaid
flowchart TD
    P["Preview controls"] --> OFF["Go offline"]
    P --> FAIL["Fail next save"]
    OFF --> ERROR["Attempt action → clear error; draft retained; no false success"]
    FAIL --> ERROR
    ERROR --> RETRY["Reconnect if needed → retry"]
    P --> COMP["Fill request with another eligible person"]
    COMP --> FILLED["Original candidate's old link shows Filled"]
    P --> OVER["Create an overlapping booking for this talent"]
    OVER --> LAPSE["Other overlapping interest lapses; double-booking blocked"]
    P --> TIME["Advance time / finish booking"]
    TIME --> EVENTS["Experience reminders, owner fallback, expiry and past-work reporting"]
    P --> NUDGE["Create availability nudge → open editor"]
    P --> RESET["Reset stories → restore members, invitations, shifts and starting clock"]
```

Use **Switch account** or two tabs in the same browser to play both participants. Separate browsers and devices have separate sample worlds. For exact click-by-click stories, see [MVP-preview-walkthrough.md](MVP-preview-walkthrough.md).
