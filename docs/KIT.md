# UI kit API (`@/ui`) — feature code uses only these

Colours are `ColorName` tokens, type `TypeName`, icons `IconName` (`src/ui/icons.ts`). Inside `<Ticket lit>`, Text/Icon/Badge/Button switch to the ink look automatically.

## Basics
- `Text {variant?='body', color?, tabular?, italic?, weight?:'400'|'600'|'700', center?, numberOfLines?, style?, ...TextProps}`
- `Icon {name, size?=20, color?, selected?, weight?, style?, accessibilityLabel?}` (hidden from screen readers unless labelled)
- `Button {label, onPress?, variant?:'primary'|'secondary'|'quiet'|'danger', size?:'regular'|'large', icon?, loading?, done?:string|false|null, disabled?, fullWidth?, accessibilityLabel?, accessibilityHint?, style?}` — `done="Booked"` springs into check + word, stops presses. No haptics built in.
- `haptics.commit()/warn()/select()` (also `commit`, `warn`, `select`). `run()` in the data store already fires commit/warn — don't double up.

## Cards & status
- `Ticket {children, lit?, spiked?, onPress?, padding?=16, gap?=8, accessibilityLabel?, style?}` — lit = waiting on you (ink).
- `Badge {label, tone?:'neutral'|'good'|'attention'|'danger', icon?:IconName|null, numberOfLines?=2}` — word + symbol always. Default symbols: neutral `circle`, good sage dot, attention `waiting`, danger `alert`. `icon={null}` only for non-status labels. Wraps to 2 lines.
- `CountBadge {count, max?=9}`
- `Photo {uri?, source?:number, name?, aspect?=4/5, radius?, width?, circle?, size?=40, style?, accessibilityLabel?}` — `source` is a bundled `require()` image, used when `uri` is empty; monogram fallback. `Avatar {uri?, source?, name?, size?:28|40|56|96}`
- `Scrim {edge?:'bottom'|'top', height?='62%', strength?=0.8, style?}` — gradient (`backgroundImage: linear-gradient`) over a photo's edge; absolute inside the photo box. `OnPhoto {children}` — text/icons inside read light over the scrim in both themes.
- `KeyValue {label, value, tabular?, icon?, labelWidth?=72}`
- `Headline {parts:(string|{em:string})[], variant?='display', color?, center?}`
- `Pass {kind:'member'|'venue', name, role?, photo?, facts?:{label,value,tabular?}[], status?:'none'|'pending'|'success'|'error'}`

## Lists & form rows (inside `Section`)
- `GroupHeading {title, count?, action?:{label,onPress}, style?}` — THE heading for a group of tickets on a screen ("Needs you", "Upcoming"): serif title3 + muted tabular count, header role. Not uppercase. (`Section label` stays for form/settings groups.)
- `Disclosure {title, count?, expanded?, defaultExpanded?=false, onToggle?(next), children, gap?='md', style?}` — collapsible "Past and closed (N)"; `accessibilityState.expanded`, chevron turns (instant under Reduce Motion).
- `Section {label?, footer?, children, separatorInset?=16}` — draws hairlines itself.
- `Row {title, titleSerif?, subtitle?, subtitleLines?=1, subtitleTabular?, icon?, photo?:{uri?,source?,name?}, leading?, value?, valueTabular?, trailing?, chevron?, onPress?, destructive?, disabled?, accessibilityLabel?}` — `titleSerif` for a person's/venue's name.
- `DetailRow {label, value, tabular?, numberOfLines?, trailing?, onPress?, chevron?(default onPress), destructive?, disabled?, accessibilityLabel?, accessibilityHint?}` — facts: muted label above a value that wraps (a day's "17:00–23:00 · 6.25 hours · £112.50", an address, a note).
- `Separator`
- `TextRow {label, value, onChangeText, placeholder?, keyboardType?, multiline?, maxLength?, error?, autoCapitalize?, autoComplete?, textContentType?, autoCorrect?, secureTextEntry?, returnKeyType?, onSubmitEditing?, onBlur?, editable?, autoFocus?, stacked?, prefix?, suffix?}` — `stacked`: single line, label above the input. `prefix`/`suffix`: muted text around the input (`'£'`, `'/ hour'`).
- `CodeField {value, onChange, onComplete?(code), length?=6, label?='6-digit code', error?, autoFocus?, editable?}` — one-time code: large tabular, digits only, paste cut to length, `oneTimeCode` autofill; `onComplete` fires once on the last digit (auto-submit).
- `SwitchRow {label, subtitle?, value, onValueChange, disabled?}`
- `PickerRow<T> {label, value, options:{value,label,subtitle?,disabled?}[], onChange, placeholder?, title?, disabled?, error?}`; `SelectSheet<T>`
- `TimeRow {label, value:'HH:MM'|null, onChange, placeholder?, minuteInterval?=5, disabled?, error?}`
- `DateRow {label, value:'YYYY-MM-DD'|null, onChange, minimumDate?, maximumDate?, ...}`
- `StepperRow {label, subtitle?, value, onChange, min?, max?, step?, format?}`
- `CheckRow {title, subtitle?, checked, onToggle, disabled?, disabledReason?, photo?:{uri?,source?,name?}}` (multi; `photo` = avatar after the check) · `ChoiceRow {title, subtitle?, selected, onSelect, disabled?}` (single)

## Controls
- `TextLink {label, onPress, variant?='callout', color?='text', destructive?, underline?=true, disabled?, center?, accessibilityLabel?, accessibilityHint?, style?}` — inline text button ("Keep my account", "Use a different email"); hit area ≥ 44pt.
- `IconButton {icon, onPress, accessibilityLabel (required), accessibilityHint?, variant?:'plain'|'filled'(default)|'ink', size?=32, iconSize?, color?='muted', disabled?, style?}` — round icon-only control for known actions (close, remove, send = `ink`); hit area ≥ 44pt; lit-aware.

## Pickers
- `Chip {label, selected?, onPress?, count?, icon?, disabled?, dimmed?}`
- `ChipGroup<T>` multi `{options, multiple:true, value:T[], onChange, max?, onMaxReached?}` or single `{options, value:T|null, onChange, allowDeselect?}`; option `{value,label,count?,icon?,disabled?}`
- `Segmented<T> {options:{value,label}[], value, onChange}`
- `DayPager {days:string[], value:string[], onChange, max?, onMaxReached?, describe?(day)=>{note?, tone?:'free'|'notFree'|'booked'|'none', disabled?}, perPage?=14, hideClear?}`

## Screens
- `Screen {children, title?, subtitle?, onRefresh?, refreshing?, gap?='xl', padded?=true, footer?, insideTabs?, scroll?=true, contentStyle?}` — ScrollView first. `title` = the serif page title as the first content (largeTitle, header role) — **tab roots must use it** (native large titles render empty with native tabs; tab stacks set `headerLargeTitleEnabled: false`). `insideTabs` on tab roots that have a `footer`: it sits above the floating iOS tab bar (Android tabs already clear it) and StickyAction drops its own inset. Footers rise above the keyboard on both platforms; on Android the scroll content gets a keyboard-height spacer.
- Pull to refresh: `<Screen {...useRefresh()}>` (`@/data`).
- `SheetScreen {title, subtitle?, onClose?, children, footer?, scroll?, gap?}` — for `sheet/*` routes (header hidden). Footer rises above the keyboard (iOS lifts it; Android sheets move themselves above the keyboard).
- `StickyAction {primary:{label,onPress,icon?,loading?,done?,disabled?,variant?:'primary'|'danger'}, secondary?, tertiary?, note?, safeArea?}` — pass as `footer`. `note` wraps up to 3 lines (tabular). `tertiary` = a quiet button under the row ("Mark as a no-show"). `safeArea` defaults to true, false inside `<Screen insideTabs>`.
- `KeyboardFooter {children, insetHandled?, overlap?, anchored?, style?, onLayout?}` — lifts a custom bottom bar (chat composer) above the keyboard on both platforms; Screen/SheetScreen already use it for `footer`. `KeyboardSpacer` — keyboard-height spacer for the end of a custom ScrollView on Android. `useKeyboardOverlap(points)` — for custom footer contents: how much bottom padding may hide behind the keyboard.

## States
- `Loading {count?=3, variant?:'ticket'|'rows'}` · `Empty {title, message?, icon?, action?:{label,onPress}}` · `ErrorState {title?, message?, onRetry?, retryLabel?, retrying?}` · `Notice {text, tone?:'info'|'good'|'warning'|'danger', icon?}` · `WaitingForApproval {action?}` (copy verbatim from §1.3, curly apostrophes)
- `LiveGate` (`@/data`) `{children: node | ({data, me, side, live}) => node, approval?=true, waitingAction?, header?, title?, loading?:LoadingProps, bare?}` — replaces the copy-pasted gate: loading skeleton → load error + Try again → WaitingForApproval (when `approval`) → children. Not ready, it draws `<Screen title={title}>{header}{state}</Screen>`; `bare` draws only the state.

## Toasts
- `useToast() → {show(text, {tone?:'good'|'error', position?, duration?}), hide()}` (the store's `run` already toasts). Default duration by tone (§10.9): good 3500 ms, error 6000 ms (`TOAST_DURATION`).
- `ToastHost` — put one as the last child inside any React Native `<Modal>` so toasts show above it on Android (iOS toasts already float above modals; it renders nothing there). `PhotoCropModal` includes one.

## Photos
- `PhotoCropModal {photo:PickedPhoto|null, visible?=true, onDone(photo), onCancel, title?='Position your photo', aspect?, hint?, maxWidth?, quality?}` — the cropper in a full-screen Modal with gesture root, safe areas and `ToastHost`. Use this instead of hand-rolling the Modal.
- `PhotoCropper {uri, width, height, onDone({uri,width,height}), onCancel, aspect?=4/5, maxWidth?=1080, quality?=0.9, hint?}`
- `pickPhoto(source?:'library'|'camera') → {status:'picked',photo:{uri,width,height}}|{status:'cancelled'}|{status:'error',error}`

## Date helpers
`weekdayShort, dayNumber, monthShort, formatDay, formatDayLong, ymdToDate, dateToYmd, hmToDate, dateToHm` — but prefer `@/domain` label helpers for anything the web shows.

## Display helpers (`@/domain`, pure)
- `money(n)` → `£18` / `£18.50` (§10.8; show with `tabular`).
- `hoursNumber(h)` → `6.25` (no float noise) · `hoursLabel(h, unit?:'hours'|'h')` → `6.25 hours` / `1 hour` / `6.25 h` · `minutesToHours(m)`.
- `whenLine(data, shift, dates?)` → `Thu 8 Oct · 17:00–23:00`, `Mon 5–Wed 7 Oct · 17:00–23:00`, `Tomorrow · 17:00–23:00` (web Discovery.tsx; empty/missing `dates` = whole shift; `''` for no days).
- `daysPhrase(dates, total)` → `all 3 days` / `Thu 8 only` / `2 days` · `sentTo(data, shift)` → `Job post` / `Request · Poppy, Theo` / `Request · 4 people` · `people(n)` → `1 person` / `3 people`.

## Data hooks (`@/data`)
- `run(key, fn, opts?)` / `runResult(key, fn, opts?) → {ok:true,value}|{ok:false,error,offline,skipped?}`. `opts: {success?, args?, onError?(message), quiet?}`. **Always pass `args`** (what the tap sends): a client_ref is reused only when key and args both match. `onError` = the sheet's inline error (§1.6.4; the toast still shows). `quiet` = no commit haptic, no success toast.
- `useMessage() → (otherMemberId) => Promise<void>` — open-thread (§7.3): pushes the existing `/chat/[id]` or runs `open_conversation` quietly, then pushes.
- `useRefresh() → {refreshing, onRefresh}` — spread into `<Screen>`.
- `holdAuth(on)` — the reset-password screen calls `holdAuth(false)` when it is left without succeeding (`verifyResetAndSetPassword` holds and releases it itself).

## Shell (`@/features/shell`)
- `HeaderActions` — put `<HeaderActions />` in every tab-root screen (the notifications bell).
- Tab-root titles: `<Stack.Screen options={{ title: 'Shifts' }} />` for the header/back title, AND `<Screen title="Shifts">` for the visible serif page title (native large titles are off on tab roots).
