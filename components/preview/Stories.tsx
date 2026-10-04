"use client";
import { useState } from "react";
import { usePreview } from "./context";
import { Button, Heading, Modal } from "./ui";
import { navigateRoute, resetPreview } from "@/lib/preview/store";
export const STORIES = [
  {
    title: "Find vetted people and book them in chat",
    who: "Spruce → Theo → Spruce",
    start: "/venue/spruce/home",
    steps: [
      "As Spruce, Book opens on tomorrow, 17:00–23:00. Tap the date bar: a calendar opens. Untick tomorrow, tap Wed 7, then Done. You can pick up to seven dates, months ahead. Each team tile says how many people are free then.",
      "Tap Kitchen, then the CDP chip. Big photo cards: Poppy first, marked Free then. Theo hasn’t set his availability, so his card says so and comes next. Everyone else on Dyuknow follows, so nobody vetted is hidden while the network is small.",
      "Every card shows the person’s minimum pay: Theo’s is £17/h. Tap Message on his card and say hello. You don’t need a shift to talk.",
      "In the chat, tap Send booking request. CDP, Wed 7 and 17:00–23:00 are already filled in from the list. Open the dates and add Thu 8 too. Set the pay to £15 to see the below-minimum warning, then send. The request arrives as a card, not a text.",
      "Switch account → Theo. Shifts shows the card under Invitations. Open it → Ask for changes → “£17 is my minimum, happy to do the full service” → Send.",
      "Switch to Spruce. Bookings → Open shows “Asked for changes · Revise”. In the chat, Send revised booking at £17. The first card is marked as replaced.",
      "Switch to Theo → Accept and book. He’s booked for both nights straight away. The booking shows on Theo’s Upcoming shifts and on Spruce’s Bookings, and any later cancellation is posted in this same chat.",
    ],
  },
  {
    title: "Create a job post instead",
    who: "Spruce → Poppy",
    start: "/venue/spruce/post",
    steps: [
      "As Spruce, tap the black Create a job post button under the sidebar (on phones, the round + in the middle of the tab bar). Choose Kitchen.",
      "The form asks for the position, dates, hours, pay and people needed. Post shift texts everyone in those positions; Invite specific people sends to a shortlist.",
      "Switch to Poppy. The post is on Shifts under Open shifts in your roles.",
    ],
  },
  {
    title: "A posted shift becomes a booking",
    who: "Spruce → Poppy → Spruce",
    start: "/venue/spruce/home",
    steps: [
      "As Spruce: Create a job post → Kitchen. CDP and Senior CDP are preselected from last time. Pick dates → Sat 3, keep 17:00–23:00, then Post shift (it texts Poppy and Theo).",
      "Switch account → Poppy. The Spruce shift is on Shifts. Open it → I can cover this → add a note → Send. The bar now says you’re waiting, not booked.",
      "Switch to Spruce. Home shows “1 can cover · Review”. Open it: Poppy’s card shows the note, skills and “Worked with you” (from Poppy’s past Spruce booking). Tap Message and ask a question.",
      "In the chat, the pinned card has Book Poppy. Book her there. The screen becomes “Poppy’s coming …”.",
      "Switch to Poppy. Shifts now starts with the Spruce booking under Upcoming shifts, with the address, Directions and Add to calendar one tap away.",
    ],
  },
  {
    title: "A personal invitation confirms immediately",
    who: "The Sea The Sea → Camille",
    start: "/talent/camille/home",
    steps: [
      "Camille’s home shows The Sea The Sea under Invited you. Open it. Message the venue if you have a question.",
      "Accept and book → confirm. You’re booked straight away; the venue said yes when it invited you.",
      "Switch to The Sea The Sea → Bookings → Upcoming. The booking reads “Camille’s coming on Sat 3 Oct at 18:00”.",
    ],
  },
  {
    title: "Partial cover: mix and match by day",
    who: "Harper Privé → Poppy / Theo",
    start: "/talent/poppy/shift/harper-weekend",
    steps: [
      "As Poppy, open Harper Privé’s 3-day CDP shift → I can cover this. Tue is unticked because Poppy marked it not free. Untick Mon too: the button reads Offer 1 day (Sun only).",
      "As Theo, open the same shift → I can cover this → Offer all 3 days.",
      "As Harper Privé, open the shift. The day tracker lists each day with who can cover it: “Sun 4 Oct · 2 can cover: Poppy (Sun only), Theo (all 3 days)”.",
      "On Sun, tap Book Poppy. Sun shows Booked · Poppy; Mon and Tue stay open. Theo’s card now says “Offered all 3 days (Sun filled)” and Book Theo · 2 days.",
      "On Mon, tap Book Theo (Mon only). Then on Tue, Book Theo again: it adds Tue to Theo’s existing booking rather than creating a second one.",
      "Try it the other way: right after Harper books Poppy for Sun, open the shift as Poppy. It shows “Booked Sun 4 · Mon 5, Tue 6 still open” with Offer more days.",
    ],
  },
  {
    title: "Each person covers every day",
    who: "The Sea The Sea → Ethan / Camille",
    start: "/talent/ethan/shift/sea-residency",
    steps: [
      "When posting more than one day, the venue can switch on “Each person must cover every day”. The Sea The Sea’s 3-night Sous Chef shift already has it on.",
      "As Ethan, open it → I can cover this. All three days are fixed; the button reads Offer all 3 days.",
      "Anyone booked elsewhere on one of those nights doesn’t see the shift in their feed, and opening it explains which night clashes.",
    ],
  },
  {
    title: "Invite a shortlist; first acceptance wins",
    who: "Spruce → Poppy / Theo",
    start: "/venue/spruce/new/Kitchen",
    steps: [
      "As Spruce: pick a date → Invite specific people (accepting books them straight away) → select Poppy and Theo for one place. The note says the first to accept is booked.",
      "Switch to Poppy → Accept and book.",
      "Switch to Theo → open the invitation. It says the shift has been filled. Theo was never booked.",
    ],
  },
  {
    title: "Cancel, notify and find replacement cover",
    who: "Poppy → Spruce → Theo",
    start: "/talent/poppy/home",
    steps: [
      "As Poppy, open a booking from Shifts → Upcoming shifts → Cancel booking → choose a reason.",
      "Switch to Spruce. The shift has reopened: “Poppy cancelled · needs someone”, with Text everyone again and Invite people. Find a replacement on the cancelled booking goes to the same shift.",
      "Send it, respond as Theo, and book Theo. The cancellation and its replacement stay as separate records.",
    ],
  },
  {
    title: "Withdraw, decline, close, or change terms",
    who: "Either side before booking",
    start: "/talent/poppy/home",
    steps: [
      "Respond to a shift as Poppy, then Withdraw from the bar at the bottom. The venue sees “Withdrew”.",
      "As Camille, decline the seeded invitation (reset stories first if already accepted). The Sea The Sea sees Declined.",
      "As a venue, open an open shift → ⋯ → Change time, pay or role. Back out without changing anything and no draft is left. Change the pay and go home: “Unsent changes to your … shift” with Continue or Discard.",
      "⋯ → Close shift. Waiting people are told; people already booked stay booked.",
    ],
  },
  {
    title: "Availability, discovery and overnight work",
    who: "Talent and venue",
    start: "/talent/poppy/bookings",
    steps: [
      "My shifts is your calendar. Choose a day → Free from–to → save. Copy to other dates, or mark Not free. Free all day covers midnight to midnight.",
      "As Spruce, start a shift → Invite specific people. People you’ve worked with come first, then people free then, then everyone else.",
      "Set 22:00–02:00 on a shift. The day list shows both calendar dates.",
      "As talent, Shifts runs top to bottom: upcoming shifts, invitations, then the Shifts / Venues switch. Shifts lists your roles; Show from other roles too adds the rest. Past and closed sits at the bottom.",
    ],
  },
  {
    title: "Conflicts, stale links and failed saves",
    who: "Preview controls makes time and competition testable",
    start: "/venue/spruce/home",
    steps: [
      "Post a CDP shift and respond as Poppy. Open it as Spruce, then Preview controls → Fill this shift with another person. Poppy’s link now opens a filled shift.",
      "On an open shift as talent, Preview controls → Create an overlapping booking for me. Clashing days drop out of your other answers, or the answer lapses.",
      "Preview controls → Go offline, or Fail next save. Nothing pretends to succeed, and drafts stay.",
      "Preview controls → Advance to this shift’s start. Unfilled places close.",
    ],
  },
  {
    title: "No supply, no reply and owner help",
    who: "Venue → Owner",
    start: "/venue/spruce/home",
    steps: [
      "Create a job post → Sommelier. Nobody has that role yet, so the button reads Ask Dyuknow to find someone.",
      "On any open shift with no replies, Ask Dyuknow to help alerts the owner. Same-day shifts also alert the owner after 30 minutes.",
      "Switch account → Owner to see the request.",
    ],
  },
  {
    title: "After service: private outcomes and book again",
    who: "Both sides → Owner",
    start: "/venue/spruce/bookings",
    steps: [
      "Bookings → Past and cancelled → the seeded Poppy booking. Answer “Did it go ahead?”. Only Dyuknow sees it.",
      "Book Poppy again opens a prefilled invite; pick new dates and send.",
      "Report a problem on an upcoming booking tells Dyuknow without cancelling anything.",
    ],
  },
  {
    title: "Joining, claiming, approval and profile defaults",
    who: "New member → Owner",
    start: "/",
    steps: [
      "From the welcome screen choose Try phone sign-in. Use an existing sample number and code 123456 to claim its preloaded profile.",
      "Choose Explore new-member setup, finish it, and the account waits for approval.",
      "Switch account → Owner → Members → Approve. Switch back to the new member.",
      "Profile → edit roles, skills and alert preferences. Venues edit address, rate and the default note used on new shifts.",
    ],
  },
];
export function Stories() {
  const { go } = usePreview();
  const [reset, setReset] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  return (
    <>
      <Heading
        title="Walk both sides of the pass."
        description="A hands-on guide. Switch accounts to play every part; nothing auto-replies or silently books for you."
      />
      <div className="pv-guide-intro">
        <p>
          The sample world starts on{" "}
          <strong>Thursday 1 October 2026, 10:00 in London</strong>. Preview
          controls lets you advance time. Profiles, contacts and venues are
          illustrative; every change is saved in this browser. Follow stories
          1–7 in order; the October dates keep their bookings separate. For an
          alternative outcome or after advancing time, use Reset all stories to
          return to the starting clock.
        </p>
        <p>
          <strong>Venue entry:</strong> I’m a venue → Enter as Spruce.{" "}
          <strong>Talent entry:</strong> I’m talent → Enter as Poppy. Use
          Camille for the invitation story.
        </p>
        <div className="pv-actions">
          <Button onClick={() => navigateRoute("/venue/spruce/home")}>
            Start as Spruce
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigateRoute("/talent/poppy/home")}
          >
            Start as Poppy
          </Button>
          <Button variant="quiet" onClick={() => setReset(true)}>
            Reset all stories
          </Button>
        </div>
      </div>
      <div className="pv-stories">
        {STORIES.map((s, i) => (
          <details key={s.title} open={i === 0}>
            <summary>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2>{s.title}</h2>
                <p>{s.who}</p>
              </div>
            </summary>
            <div className="pv-story-content">
              <ol>
                {s.steps.map((step, j) => (
                  <li key={step}>
                    <label className="pv-check">
                      <input
                        type="checkbox"
                        checked={checked.includes(`${i}/${j}`)}
                        onChange={(e) =>
                          setChecked(
                            e.target.checked
                              ? [...checked, `${i}/${j}`]
                              : checked.filter((c) => c !== `${i}/${j}`),
                          )
                        }
                      />
                      {step}
                    </label>
                  </li>
                ))}
              </ol>
              <Button
                variant="secondary"
                onClick={() => navigateRoute(s.start)}
              >
                Open this story’s starting account
              </Button>
            </div>
          </details>
        ))}
      </div>
      <p className="pv-caption">
        Two tabs in the same browser share preview data. Separate browsers or
        devices do not. The frontend models transitions; backend authentication,
        transaction safety, SMS delivery and real-time timers are outside this
        preview.
      </p>
      {reset && (
        <Modal
          title="Start the sample world again?"
          onClose={() => setReset(false)}
        >
          <p>
            This clears only MVP preview activity in this browser and restores
            the starting stories. It leaves the original app’s storage alone.
          </p>
          <Button
            onClick={() => {
              resetPreview();
              setReset(false);
              go("home");
            }}
          >
            Reset stories
          </Button>
        </Modal>
      )}
    </>
  );
}
