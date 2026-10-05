"use client";
import { useState } from "react";
import { usePreview } from "./context";
import { Button, Heading, Modal } from "./ui";
import { navigateRoute, resetPreview } from "@/lib/preview/store";
export const STORIES = [
  {
    title: "Pick a date, pick people, send a booking request",
    who: "Spruce → Poppy and Theo → Spruce",
    start: "/venue/spruce/home",
    steps: [
      "As Spruce, Book opens on tomorrow at Dinner (17:00–23:00). Untick tomorrow and tap Wed 7. Each team tile says how many people are free then.",
      "Tap Kitchen. Everyone is listed: free people in the team first, then busy or unset, then everyone else. Each card shows their minimum pay.",
      "Tap Add to request on Poppy and Theo, then Send booking request to Poppy and Theo at the bottom.",
      "The form is the same one a job post uses: position, dates and hours, pay, people needed, note. Everything is filled in. Send it.",
      "Switch account → Theo. Shifts shows it under Booking requests. Open it → I can do this → Send. He isn’t booked yet.",
      "Switch to Poppy and say yes too.",
      "Switch to Spruce. Bookings → Open shows “2 can do it · Review”. Open it and Book Theo. Poppy is told it’s filled. Theo’s card in chat now says Booked.",
    ],
  },
  {
    title: "Post a job instead",
    who: "Spruce → Poppy → Spruce",
    start: "/venue/spruce/post",
    steps: [
      "As Spruce, tap Post a job (the black button in the sidebar; on phones, the round + in the tab bar). Choose Kitchen.",
      "It’s the same form, with To: everyone in the position. Pick CDP and Sat 3, then Post job. Poppy and Theo are texted.",
      "Switch to Poppy. It’s on Shifts under Open jobs. Open it → I can do this → add a note → Send.",
      "Switch to Spruce. Poppy’s yes arrived as a card in your conversation with her, with Book Poppy on it. Book her there or from the job post.",
    ],
  },
  {
    title: "Several days: book different people for different days",
    who: "Harper Privé → Poppy / Theo",
    start: "/talent/poppy/shift/harper-weekend",
    steps: [
      "As Poppy, open Harper Privé’s 3-day CDP job → I can do this. Tue is unticked because Poppy marked it not free. Untick Mon too, then send a yes to Sun only.",
      "As Theo, open the same job → I can do this → Yes to all 3 days.",
      "As Harper Privé, open the job. Each day lists who can do it: “Sun 4 Oct · 2 can do it: Poppy (Sun only), Theo (all 3 days)”.",
      "On Sun, tap Book Poppy. Mon and Tue stay open. On Mon, Book Theo; then on Tue, Book Theo again. Tue is added to Theo’s booking, not made a second one.",
    ],
  },
  {
    title: "Same person for all days",
    who: "The Sea The Sea → Ethan",
    start: "/talent/ethan/shift/sea-residency",
    steps: [
      "With more than one day, the form shows “Same person for all days”. The Sea The Sea’s 3-night Sous Chef job has it on.",
      "As Ethan, open it → I can do this. All three days are fixed; the button reads Yes to all 3 days.",
      "Anyone booked elsewhere on one of those nights doesn’t see it in Open jobs, and opening it explains which night clashes.",
    ],
  },
  {
    title: "Answer a booking request",
    who: "The Sea The Sea → Camille",
    start: "/talent/camille/home",
    steps: [
      "Camille’s Shifts shows The Sea The Sea under Booking requests. Open it. Message the venue if anything doesn’t work.",
      "I can do this → Send. The Sea The Sea still confirms; Camille sees “Waiting for The Sea The Sea to confirm”.",
      "Or Decline. To change pay or times, say so in chat; the venue sends a new request.",
    ],
  },
  {
    title: "Cancel days and free both calendars",
    who: "Poppy → Spruce",
    start: "/talent/poppy/home",
    steps: [
      "Book Poppy for a multi-day job first (story 3 works). As Poppy, open the booking → Cancel days → tick one day → choose a reason.",
      "The other days stay booked. Her calendar frees up for that day.",
      "Switch to the venue. The job has reopened for that day: “Poppy cancelled · Mon 5 needs 1 person”, with Send to more people.",
    ],
  },
  {
    title: "Every day worked is recorded",
    who: "Spruce → Poppy",
    start: "/venue/spruce/bookings",
    steps: [
      "Bookings → Past and cancelled → the seeded Poppy booking. Its Days list shows Mon 28 Sep worked, 17:00–23:00, 6 hours, £108.",
      "Book someone, open the booking, then Preview controls → Finish this booking.",
      "Bookings now shows Confirm hours. Open it → Confirm hours → change the finish time if they stayed late → Confirm. Or mark that they didn’t show.",
      "If the venue does nothing, the day confirms itself at the planned hours 48 hours after it ends.",
    ],
  },
  {
    title: "Availability",
    who: "Talent and venue",
    start: "/talent/poppy/bookings",
    steps: [
      "Availability shows two weeks at a time; the arrows go up to eight weeks ahead. Choose a day → Free from–to → save, or mark Not free. Copy to other dates.",
      "Venues see it as Free then / Not free then on each card. It’s a guide, not a block: a venue can still ask someone marked busy.",
      "Being booked is the only hard block: you can’t be booked twice for the same hours.",
    ],
  },
  {
    title: "Conflicts, stale links and failed saves",
    who: "Preview controls makes time and competition testable",
    start: "/venue/spruce/home",
    steps: [
      "Post a CDP job and say yes as Poppy. Open it as Spruce, then Preview controls → Fill this shift with another person. Poppy’s link now opens a filled job.",
      "On an open job as talent, Preview controls → Create an overlapping booking for me. Clashing days drop out of your other yeses, or the yes lapses.",
      "Preview controls → Go offline, or Fail next save. Nothing pretends to succeed.",
      "Preview controls → Advance to this shift’s start. Unfilled places close.",
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
          illustrative; every change is saved in this browser. The October
          dates keep each story’s bookings separate. For an
          alternative outcome or after advancing time, use Reset all stories to
          return to the starting clock.
        </p>
        <p>
          <strong>Venue entry:</strong> I’m a venue → Enter as Spruce.{" "}
          <strong>Talent entry:</strong> I’m talent → Enter as Poppy. Use
          Camille for the booking request story.
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
