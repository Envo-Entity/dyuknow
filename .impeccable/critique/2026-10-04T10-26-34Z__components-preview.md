---
target: the /app preview demo
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/shivansh/Code/Envo/dyuknow/components/preview"
timestamp: 2026-10-04T10-26-34Z
slug: components-preview
---
Method: dual-agent (A: design review · B: detector). Browser inspection unavailable (permission declined); source-only.

## Design Health Score — 25/40
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 3 | "3 free then" depends on remembered "then" |
| 2 | Match real world | 3 | Job post / cover / shift naming drift |
| 3 | User control | 2 | One-tap irreversible decline/withdraw/decline card |
| 4 | Consistency | 2 | Two accept paths (confirm vs one tap); two date pickers |
| 5 | Error prevention | 2 | 6-month booking vs 14-day availability horizon |
| 6 | Recognition | 3 | "Worked with you" hidden on phone |
| 7 | Flexibility | 2 | No hour presets, no calendar keys, no broadcast |
| 8 | Aesthetic/minimal | 3 | Duplicated tap targets |
| 9 | Error recovery | 3 | Toast-only model errors |
| 10 | Help | 2 | Rules surface inconsistently |

## Design specificity
~2/3 authored (in-chat booking card, partial cover, min pay, LW guard, clash copy); visual skin category-generic. Detector: 1 finding, overused-font preview.css:1291 — false positive (DESIGN.md stack).

## Priority issues
1. [P1] Booking-card accept is one tap with weak ending (Booking.tsx:517) → confirm sheet + land on booking; undo toasts for decline/withdraw. /impeccable harden
2. [P1] Phone team list 2-up small cards, hidden trust flag, 38px buttons, aria-label swallows status (Booking.tsx:333) → 1-col full-bleed, one 44px Message, photo opens profile. /impeccable adapt
3. [P1] Team list dead end → closing "Post to everyone free then" row; optional quiet divider before other teams. /impeccable layout
4. [P2] Vocabulary + sage meaning both booked and act-now (Discovery.tsx:571) → one noun per object; attention badge variant. /impeccable clarify
5. [P2] Availability editor: 14-day horizon, dual selection model → reuse Calendar, 3-way kind switch. /impeccable distill

## Persona red flags
Duty manager on phone: tomorrow default, ~9 taps/person, no broadcast, team chips she doesn't need. Chef between services: mixed destinations in Invitations, 4 tap targets per row, one-tap accept. First-timer: 8 entry options, outdated venue panel copy.

## Minor
Remaining filler ("When do you need someone?", "· Sent", "Your conversation starts here."); .pv-post-job off-screen <640px tall; ⋯ menu no Escape; silent 7-date cap; 80 hex literals; stale DESIGN.md.
