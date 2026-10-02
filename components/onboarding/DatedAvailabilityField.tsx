"use client";

import { useState } from "react";
import { ChipField } from "./ChipField";
import { FormField } from "./FormField";
import { londonToday, upcomingDates, validateDatedAvailability } from "@/lib/onboardingModel";
import type { DatedAvailability } from "@/lib/types";

export function DatedAvailabilityField({ value, onChange }: { value: DatedAvailability[]; onChange: (next: DatedAvailability[]) => void }) {
  const [date, setDate] = useState(londonToday);
  const [mode, setMode] = useState("Free from–to");
  const [start, setStart] = useState("16:00");
  const [end, setEnd] = useState("23:59");
  const [error, setError] = useState<string | null>(null);

  function selectDate(next: string) {
    setDate(next);
    setError(null);
    const entry = value.find((v) => v.date === next);
    if (entry) {
      setMode(entry.kind === "not-free" ? "Not free" : entry.start === entry.end ? "Free all day" : "Free from–to");
      setStart(entry.start);
      setEnd(entry.end);
    } else {
      setMode("Free from–to");
      setStart("16:00");
      setEnd("23:59");
    }
  }

  function addDate() {
    const entry: DatedAvailability = { date, kind: mode === "Not free" ? "not-free" : "free", start: mode === "Free from–to" ? start : "00:00", end: mode === "Free from–to" ? end : "00:00" };
    const next = [...value.filter((v) => v.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date));
    const problem = validateDatedAvailability([entry]);
    setError(problem);
    if (!problem) onChange(next);
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Dated availability">
      <div>
        <h2 className="text-[18px] font-semibold text-ink">When are you free? <span className="text-[14px] font-normal text-muted">Optional</span></h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">Add specific dates and hours in London time. Your general availability preferences above stay as they are.</p>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Next fourteen days">
        {upcomingDates(londonToday()).map((day) => (
          <button type="button" key={day} aria-pressed={day === date} onClick={() => selectDate(day)} className={`rounded-full border px-3 py-2 text-[12px] font-semibold ${day === date ? "border-sage bg-sage text-ink" : "border-border text-ink"}`}>
            {new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${day}T12:00:00Z`))}
          </button>
        ))}
      </div>
      <FormField label="Availability date" type="date" min={londonToday()} value={date} onChange={selectDate} />
      <ChipField label="Availability on this date" options={["Free all day", "Free from–to", "Not free"]} selected={[mode]} onToggle={setMode} />
      {mode === "Free from–to" && (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Free from" type="time" value={start} onChange={setStart} />
          <FormField label="Free until" type="time" value={end} onChange={setEnd} />
        </div>
      )}
      {mode === "Free from–to" && end < start && <p className="text-[13px] text-ink-soft">Ends the following day.</p>}
      {error && <p role="alert" className="text-[13px] font-semibold text-ink">{error}</p>}
      <button type="button" onClick={addDate} className="self-start rounded-full border border-ink px-5 py-3 text-[13px] font-semibold text-ink">{value.some((v) => v.date === date) ? "Update date" : "Add date"}</button>
      {value.length > 0 && (
        <ul className="flex flex-col gap-3" aria-label="Saved availability dates">
          {value.map((entry) => (
            <li key={entry.date} className="flex items-center justify-between gap-3 text-[13px] text-ink">
              <span>{entry.date} · {entry.kind === "not-free" ? "Not free" : entry.start === entry.end ? "Free all day" : `${entry.start}–${entry.end}${entry.end < entry.start ? " (+1 day)" : ""}`}</span>
              <button type="button" className="shrink-0 underline underline-offset-4" aria-label={`Remove availability for ${entry.date}`} onClick={() => onChange(value.filter((v) => v.date !== entry.date))}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
