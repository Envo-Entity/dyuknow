# UI kit API (`@/ui`) — feature code uses only these

Colours are `ColorName` tokens, type `TypeName`, icons `IconName` (`src/ui/icons.ts`). Inside `<Ticket lit>`, Text/Icon/Badge/Button switch to the ink look automatically.

## Basics
- `Text {variant?='body', color?, tabular?, italic?, weight?:'400'|'600'|'700', center?, numberOfLines?, style?, ...TextProps}`
- `Icon {name, size?=20, color?, selected?, weight?, style?, accessibilityLabel?}` (hidden from screen readers unless labelled)
- `Button {label, onPress?, variant?:'primary'|'secondary'|'quiet'|'danger', size?:'regular'|'large', icon?, loading?, done?:string|false|null, disabled?, fullWidth?, accessibilityLabel?, accessibilityHint?, style?}` — `done="Booked"` springs into check + word, stops presses. No haptics built in.
- `haptics.commit()/warn()/select()` (also `commit`, `warn`, `select`). `run()` in the data store already fires commit/warn — don't double up.

## Cards & status
- `Ticket {children, lit?, spiked?, onPress?, padding?=16, gap?=8, accessibilityLabel?, style?}` — lit = waiting on you (ink).
- `Badge {label, tone?:'neutral'|'good'|'attention'|'danger', icon?:IconName|null}` — word + symbol always.
- `CountBadge {count, max?=9}`
- `Photo {uri, name?, aspect?=4/5, radius?, width?, circle?, size?=40, style?}` — monogram fallback. `Avatar {uri, name?, size?:28|40|56|96}`
- `KeyValue {label, value, tabular?, icon?, labelWidth?=72}`
- `Headline {parts:(string|{em:string})[], variant?='display', color?, center?}`
- `Pass {kind:'member'|'venue', name, role?, photo?, facts?:{label,value,tabular?}[], status?:'none'|'pending'|'success'|'error'}`

## Lists & form rows (inside `Section`)
- `Section {label?, footer?, children, separatorInset?=16}` — draws hairlines itself.
- `Row {title, subtitle?, icon?, photo?:{uri,name?}, leading?, value?, valueTabular?, trailing?, chevron?, onPress?, destructive?, disabled?, accessibilityLabel?}`
- `Separator`
- `TextRow {label, value, onChangeText, placeholder?, keyboardType?, multiline?, maxLength?, error?, autoCapitalize?, autoComplete?, textContentType?, secureTextEntry?, returnKeyType?, onSubmitEditing?, onBlur?, editable?, autoFocus?}`
- `SwitchRow {label, subtitle?, value, onValueChange, disabled?}`
- `PickerRow<T> {label, value, options:{value,label,subtitle?,disabled?}[], onChange, placeholder?, title?, disabled?, error?}`; `SelectSheet<T>`
- `TimeRow {label, value:'HH:MM'|null, onChange, placeholder?, minuteInterval?=5, disabled?, error?}`
- `DateRow {label, value:'YYYY-MM-DD'|null, onChange, minimumDate?, maximumDate?, ...}`
- `StepperRow {label, subtitle?, value, onChange, min?, max?, step?, format?}`
- `CheckRow {title, subtitle?, checked, onToggle, disabled?, disabledReason?}` (multi) · `ChoiceRow {title, subtitle?, selected, onSelect, disabled?}` (single)

## Pickers
- `Chip {label, selected?, onPress?, count?, icon?, disabled?, dimmed?}`
- `ChipGroup<T>` multi `{options, multiple:true, value:T[], onChange, max?, onMaxReached?}` or single `{options, value:T|null, onChange, allowDeselect?}`; option `{value,label,count?,icon?,disabled?}`
- `Segmented<T> {options:{value,label}[], value, onChange}`
- `DayPager {days:string[], value:string[], onChange, max?, onMaxReached?, describe?(day)=>{note?, tone?:'free'|'notFree'|'booked'|'none', disabled?}, perPage?=14, hideClear?}`

## Screens
- `Screen {children, onRefresh?, refreshing?, gap?='xl', padded?=true, footer?, scroll?=true, contentStyle?}` — ScrollView first so large titles collapse.
- `SheetScreen {title, subtitle?, onClose?, children, footer?, scroll?, gap?}` — for `sheet/*` routes (header hidden).
- `StickyAction {primary:{label,onPress,icon?,loading?,done?,disabled?}, secondary?, note?, safeArea?=true}` — pass as `footer`.

## States
- `Loading {count?=3, variant?:'ticket'|'rows'}` · `Empty {title, message?, icon?, action?:{label,onPress}}` · `ErrorState {title?, message?, onRetry?, retryLabel?}` · `Notice {text, tone?:'info'|'good'|'warning'|'danger', icon?}` · `WaitingForApproval {action?}`

## Toasts
- `useToast() → {show(text, {tone?:'good'|'error', position?, duration?}), hide()}` (the store's `run` already toasts).

## Photos
- `PhotoCropper {uri, width, height, onDone({uri,width,height}), onCancel, aspect?=4/5, maxWidth?=1080, quality?=0.9, hint?}`
- `pickPhoto(source?:'library'|'camera') → {status:'picked',photo:{uri,width,height}}|{status:'cancelled'}|{status:'error',error}`

## Date helpers
`weekdayShort, dayNumber, monthShort, formatDay, formatDayLong, ymdToDate, dateToYmd, hmToDate, dateToHm` — but prefer `@/domain` label helpers for anything the web shows.

## Shell (`@/features/shell`)
- `HeaderActions` — put `<HeaderActions />` in every tab-root screen (the notifications bell).
- Tab-root titles: `<Stack.Screen options={{ title: 'Shifts' }} />` (large serif title is set up by `TabStack`).
