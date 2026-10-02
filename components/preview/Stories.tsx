"use client";
import { useState } from "react";
import { usePreview } from "./context";
import { Button, Heading, Modal } from "./ui";
import { navigateRoute, resetPreview } from "@/lib/preview/store";
export const STORIES = [
  {
    title: "A posted shift becomes a booking",
    who: "Spruce → Poppy → Spruce",
    start: "/venue/spruce/home",
    steps: [
      "As Spruce: Book → Kitchen → choose CDP → Continue to dates. Keep tomorrow, 17:00–23:00, one person. Review → Send to all 2.",
      "Switch account → Talent → Poppy Bertram. Open Notifications → the new Spruce shift. Choose I can cover this, confirm travel and send a note. You are waiting, not booked.",
      "Switch to Spruce. Open the new response from Notifications (or Bookings → Open). Choose Message beside Poppy and send a question.",
      "Switch to Poppy → Messages. Reply in the Spruce thread. Switch back to Spruce → View terms → Book → Book Poppy.",
      "Switch to Poppy → Notifications → Booking confirmed. See full arrival details, Add to calendar, Directions, and the shared conversation. Both schedules show the same booking.",
    ],
  },
  {
    title: "A personal invitation confirms immediately",
    who: "The Sea The Sea → Camille",
    start: "/talent/camille/home",
    steps: [
      "Camille starts with an invitation from The Sea The Sea for Saturday. Open the pinned invitation. Message the venue if you have a question.",
      "Choose Accept → confirm you can travel and work the listed service → Accept and book. You are booked immediately.",
      "Switch to The Sea The Sea → Bookings → Upcoming. Open Camille’s booking. The agreed dates, rate and conversation match.",
    ],
  },
  {
    title: "Invite a shortlist; first acceptance wins",
    who: "Spruce → Poppy / Theo",
    start: "/venue/spruce/home",
    steps: [
      "As Spruce: Kitchen → CDP → choose 8 October → Review → Choose who to invite.",
      "Select Poppy and Theo for one place. The first-acceptance explanation appears. Send invites.",
      "Switch to Poppy → Notifications → invitation → Accept and book.",
      "Switch to Theo → Notifications → the invitation. The shift says it is filled, and there is no active Accept button. Theo was never booked.",
    ],
  },
  {
    title: "Several days and several people",
    who: "Harper Privé → Poppy / Theo",
    start: "/venue/harper/home",
    steps: [
      "Kitchen → CDP → Pick 10 October → 3 consecutive days → People needed 2 → Review → Send to all 2.",
      "Respond as both Poppy and Theo using Switch account. Each explicitly confirms all three dates.",
      "As Harper Privé, book one response. The shift stays open at 1 of 2 booked. Book the second. It fills at 2 of 2.",
      "Each talent member has one booking containing three services. Both can download a calendar with three separate events.",
    ],
  },
  {
    title: "Cancel, notify and find replacement cover",
    who: "Poppy → Spruce → Theo",
    start: "/talent/poppy/bookings",
    steps: [
      "Complete the posted-shift story first, then as Poppy open My shifts → Upcoming → the booking.",
      "Cancel booking → choose a reason → Cancel and notify. The cancellation stays in history. Your hours aren’t silently republished as available.",
      "Switch to Spruce → Notifications → Booking cancelled. Open Find a replacement. The new request retains the remaining dates and terms, linked to the original.",
      "Send the new shift, respond as Theo, and book Theo as Spruce. The cancelled booking and its replacement are separate records.",
      "To try venue cancellation instead, cancel from Spruce’s booking. Poppy gets the notification and can reopen availability.",
    ],
  },
  {
    title: "Withdraw, decline, close, or change terms",
    who: "Either side before booking",
    start: "/talent/poppy/home",
    steps: [
      "Respond to an open shift as Poppy, then choose Withdraw response. Switch to the venue and see the withdrawal.",
      "As Camille, decline the seeded invitation (reset stories first if already accepted). The Sea The Sea sees Declined.",
      "As Spruce, post a shift and let Poppy respond. Open it as Spruce → Edit and resend. Change pay or dates, review and send. The old shift closes and Poppy is notified to review new terms.",
      "Close an unfilled shift with a reason. Waiting people see the closure. Existing bookings are never cancelled by closing remaining places.",
    ],
  },
  {
    title: "Availability, discovery and overnight work",
    who: "Talent and venue",
    start: "/talent/poppy/availability",
    steps: [
      "Choose a day → Free from–to → save different hours. Use Copy to other dates for a selection, or Not free. Free all day covers midnight to midnight.",
      "As Spruce, start a matching shift → Review → Choose who to invite. Your people appear first, then members free for every interval, then availability not set.",
      "Choose 22:00–02:00 on a shift. Review shows both calendar dates. For a bundle, every service is listed.",
      "As talent: Shifts → All roles. Try role/date/area/minimum-pay filters and Fits my published availability. Venues opens a directory with real open-shift counts.",
      "A booked interval remains blocked when editing availability. Availability is a browsing aid; alerts still follow roles.",
    ],
  },
  {
    title: "Conflicts, stale links and failed saves",
    who: "Preview controls makes time and competition testable",
    start: "/venue/spruce/home",
    steps: [
      "Post a CDP shift and respond as Poppy. Open it as Spruce, then Preview controls → Fill this shift with another person. Poppy’s old notification now opens a filled shift.",
      "On an open shift as talent, Preview controls → Create an overlapping booking for me. The response is lapsed or the action is blocked, with a clear explanation.",
      "Preview controls → Go offline. Try responding, booking or sending a message. No false success appears, and drafts stay. Reconnect and retry.",
      "Preview controls → Fail next save. Try an action, then retry. The first attempt fails without creating a booking or message; the second succeeds.",
      "Preview controls → Advance to this shift’s start. Unfilled places expire. An old invitation or response cannot create a late booking.",
    ],
  },
  {
    title: "No supply, no reply and owner help",
    who: "Venue → Owner",
    start: "/venue/spruce/home",
    steps: [
      "Post a Sommelier shift. There are no members in this role; the review says so honestly. Ask the owner for cover.",
      "Switch account → Owner. Notifications shows the request needing help; Shifts shows the full details.",
      "For a same-day CDP shift with no replies, Preview controls → Advance 30 minutes. Both the owner and venue see that help is needed.",
      "Owner can inspect upcoming bookings, cancellations and private issue reports. No external message is actually sent.",
    ],
  },
  {
    title: "After service: private outcomes and book again",
    who: "Both sides → Owner",
    start: "/venue/spruce/bookings",
    steps: [
      "Open the seeded past Poppy booking: Bookings → Past. Record Yes, worked, No-show, or There was an issue. Outcomes are private. After a no-show or issue report, Find a replacement opens a separate request; review future dates and hours.",
      "For a new booking, open it → Preview controls → Finish this booking. It moves to Past without inventing a successful outcome.",
      "Choose Book Poppy again. A new invite is prefilled with the role, hours and pay; choose new dates and send.",
      "Report running late or an issue on an upcoming booking. The owner is notified; reporting never silently cancels it.",
    ],
  },
  {
    title: "Joining, claiming, approval and profile defaults",
    who: "New member → Owner",
    start: "/",
    steps: [
      "From the welcome screen choose Try phone sign-in. Use an existing sample number and demo code 123456 to claim its preloaded profile.",
      "Choose Explore new-member setup to experience the prefilled talent or venue form. Choose predefined or custom skills, select any of the next seven dates and day/evening hours (or skip), and finish setup. The account waits for approval.",
      "Switch account → Owner → Members → Approve the new member. Switch back to that member and open their approval notice.",
      "Profile → Edit profile and alerts: update biography, shared roles, predefined skills, custom skills and notification preferences. As venue, edit address, rate and preparation defaults.",
      "Sign out returns to the welcome screen. Returning accounts keep their profiles and activity in this browser. Reset stories starts the whole sample world over.",
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
          1–5 in order; the October dates keep their bookings separate. For an
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
