# Onboarding and preview: additive decisions record

Updated 2 October 2026. This records the current decisions and their implementation; it is not a proposal to replace the data model.

## Current decision

Bring onboarding into line with the preview **by adding missing questions and storage**. Keep every existing question, field, option and saved answer. This supersedes the earlier decisions to remove questions, collapse venue names, convert stored answers, drop Events, or deduplicate members.

Admin onboarding continues to use the existing `talent_profiles` and `venue_profiles` tables. No application tables were created. The accepted preview is now the main demo UI at `/app`, `/` and `/preview`; it remains browser-local and does not read or write live member records. Real intake remains at `/admin/onboarding`, with every addition below included.

## Talent

| Question or setting | Current decision | Implementation |
| --- | --- | --- |
| Name, mobile, email, postcode, photo | Keep | Existing questions and columns |
| Chef / Front of House category | Keep as the main category; allow positions across teams | Changing category preserves positions and skills |
| Positions | Show Kitchen, Pastry, Bar, Sommelier and Floor; choose across teams | Shared catalogue; Sommelier and Maître d’ included |
| Skills | Add preview skills while keeping all older values | Shared catalogue includes Sushi, Guest Relations, Coffee, Barista and Sushi / Fish Specialist; DB rule widened |
| Own skills | Add optional “Add your own skill” | `custom_skills text[]`, separate from catalogue skills; 80 characters per skill; blanks and duplicate names ignored |
| Years in hospitality, recent employers, known for | Keep asking | Existing questions and columns |
| Date of birth | Keep asking | Existing question and column |
| Available today, preferred shifts, max travel, preferred areas, preferred rate, minimum same-day rate | Keep asking | Existing questions and columns |
| Dated availability | Add optional dates, all day, hours or not free | `dated_availability jsonb`, independent of the general preferences; London time; overnight hours supported |
| Bio | Keep the existing optional 250-character bio | Existing question and column |
| Right to work, food safety certificate, CV | Keep private for owner review | Existing uploads and private storage; no new public reads granted |
| Agreements | Keep | Existing questions and columns |
| Shift alerts | Add all shifts in your positions / today and tomorrow / off | `shift_alerts text`: `all`, `soon`, `off`; default `all` |
| Owner approval | Administrative state, not an applicant question | `approved boolean`; new entries default `false`; applicants cannot set `true` or `null` |

Dated entries use the preview's format:

```json
[{ "date": "2026-10-08", "kind": "free", "start": "16:00", "end": "23:59" }]
```

One entry per date. `kind` is `free` or `not-free`. `00:00`–`00:00` represents all day. An end time earlier than the start represents an overnight interval. New submissions cannot contain past dates; stored dates can naturally become historical. Database checks reject invalid dates, times, duplicate dates and malformed entries.

## Venue

| Question or setting | Current decision | Implementation |
| --- | --- | --- |
| Business name, trading name, registered company | Keep all three | No name columns removed or rewritten |
| Single profile display name | Trading name when provided, otherwise business name | Derived from existing answers; no extra name question |
| Email | Keep the existing question | Existing contact email column |
| Street address and postcode | Add; needed for location and directions | `street_address text`, `postcode text`; required in new venue onboarding |
| Roles you need: Chefs, FOH, Bartenders, Managers, Events | Keep | Original `roles_needed` answers remain unchanged |
| Teams you need | Add the five teams separately | `teams_needed text[]`; independent of legacy roles |
| Typical shifts and typical notice | Keep asking | Existing questions and columns |
| Weekly vacancies | Keep, owner only | Existing question and column |
| Type, cuisine, covers, team size, website, Instagram, known for, bio, contact, dress code, uniform, staff meal, both rates | Keep | Existing questions and columns; Seafood remains a cuisine |
| Agreements | Keep | Existing questions and columns |
| Owner approval | Administrative state, not an applicant question | Same approval rules as talent |

Venue postcode is used to show the area before booking; the full address is for confirmed bookings. Existing venues' addresses stay blank until they supply them.

## Shared options and compatibility

[lib/catalogue.ts](../lib/catalogue.ts) supplies teams, positions, skill groups, alert preferences, venue types, cuisines, covers, dress codes and venue traits. Real onboarding, preview setup and preview profile editing use the same relevant lists.

| Team | Positions |
| --- | --- |
| Kitchen | Demi CDP, CDP, Senior CDP, Junior Sous, Sous Chef, Head Chef, Executive Chef |
| Pastry | Pastry Chef |
| Bar | Bartender, Mixologist |
| Sommelier | Sommelier |
| Floor | Maître d’, Restaurant Manager, Supervisor, Section Waiter, Waiter, Host |

Older skill names are retained rather than converted. There is no automatic merge of Barista into Coffee or Sushi / Fish Specialist into Sushi.

For old venue drafts without `teamsNeeded`, the application infers Chefs → Kitchen and Pastry; FOH and Managers → Floor; Bartenders → Bar. Events remains in the original roles list and does not imply a new team. Explicit team answers, including an empty selection, take precedence. Older saved drafts receive defaults for new fields without losing existing answers.

## Database change and approval

The additive SQL is recorded in [the migration](../supabase/migrations/20261002000100_additive_onboarding.sql) and was applied to the existing Supabase project on 2 October 2026.

- Talent additions: `custom_skills`, `shift_alerts`, `dated_availability`, `approved`.
- Venue additions: `street_address`, `postcode`, `teams_needed`, `approved`.
- Existing skill check widened to accept Sushi and Guest Relations while retaining every formerly accepted value.
- Existing insert-only access policies retained. Additional restrictive insert policies prevent applicants from granting themselves approval. No public SELECT or UPDATE access was added.
- Existing rows have `approved = null`, meaning no recorded decision. New rows default to pending (`false`). No existing member was silently approved or rejected.
- Live approval is managed through trusted database administration; the preview's owner controls remain local demo controls. A live owner dashboard and a database-backed preview are separate work.

The existing 10 talent rows and 8 venue rows were compared before and after the schema change. Counts and fingerprints of **all original fields** matched. No existing answers were modified, no rows were deduplicated, and blank or test records were left untouched.

## Verification

TypeScript, targeted lint, the production build, the preview tests and the onboarding tests pass. Browser checks cover cross-team selections, custom skills, new fields and preservation of older questions. Database verification uses transactions that roll back test inserts so no QA member records remain.
