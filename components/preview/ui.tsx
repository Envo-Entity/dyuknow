"use client";
import {
  useEffect,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CloseIcon } from "@/components/icons";
import {
  FAMILIES,
  datesLabel,
  relativeDay,
  serviceLabel,
  shiftLabel,
  type Shift,
  areaOf,
  type Member,
} from "@/lib/preview/model";
import { usePreview } from "./context";
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  children: ReactNode;
}) {
  return (
    <button {...props} className={`pv-button pv-${variant} ${className}`}>
      {children}
    </button>
  );
}
export function Photo({
  src,
  alt = "",
  className = "",
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  return src ? (
    // Bundled local photos preserve the original editorial crop.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`pv-photo ${className}`} />
  ) : (
    <span className={`pv-monogram ${className}`} aria-hidden="true">
      {alt.slice(0, 1)}
    </span>
  );
}
export function ProfilePhoto({ person }: { person: Member }) {
  const { go } = usePreview();
  return (
    <button type="button" className="pv-profile-photo-link" aria-label={`View ${person.name}’s public profile`} onClick={() => go(`${person.side}/${person.id}`)}>
      <Photo src={person.photo} alt={person.name} />
    </button>
  );
}
export function ProfileName({ person }: { person: Member }) {
  const { go } = usePreview();
  return <button type="button" className="pv-name-link" onClick={() => go(`${person.side}/${person.id}`)}>{person.name}</button>;
}
export function InviteToggle({ name, checked, disabled, onChange }: { name: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="pv-invite-toggle">
      <input type="checkbox" aria-label={`Invite ${name}`} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span><CheckIcon size={18} /></span>
    </label>
  );
}
export function Badge({
  children,
  good = false,
}: {
  children: ReactNode;
  good?: boolean;
}) {
  return (
    <span className={`pv-badge ${good ? "is-good" : ""}`}>
      {good && <span className="pv-dot" />}
      {children}
    </span>
  );
}
export function Heading({
  title,
  description,
  back,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  back?: string;
  children?: ReactNode;
}) {
  const { go } = usePreview();
  return (
    <div className="pv-heading">
      {back && (
        <Button variant="quiet" onClick={() => go(back)}>
          <ArrowLeftIcon /> Back
        </Button>
      )}
      <div className="pv-heading-line">
        <h1>{title}</h1>
        {children}
      </div>
      {description && <p>{description}</p>}
    </div>
  );
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="pv-empty">
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children && <div className="pv-actions">{children}</div>}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { error } = usePreview();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="pv-modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      <div className="pv-modal-inner">
        <div className="pv-modal-head">
          <h2>{title}</h2>
          <button
            className="pv-icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        {children}
        {error && (
          <p className="pv-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </dialog>
  );
}
export function Services({
  shift,
  dates,
}: {
  shift: Shift;
  dates?: string[];
}) {
  const days = dates ? shift.days.filter((d) => dates.includes(d.date)) : shift.days;
  return (
    <div className="pv-services">
      {days.map((day) => (
        <p key={day.date}>{serviceLabel(day)}</p>
      ))}
      <small>London time</small>
    </div>
  );
}
export function ShiftCard({
  shift,
  label,
  good = false,
  onClick,
}: {
  shift: Shift;
  label?: string;
  good?: boolean;
  onClick?: () => void;
}) {
  const { data, go } = usePreview();
  const venue = data.members.find((m) => m.id === shift.venue)!;
  const first = shift.days[0];
  return (
    <button
      className="pv-shift-card"
      onClick={onClick || (() => go(`shift/${shift.id}`))}
    >
      <Photo src={venue.photo || FAMILIES[shift.family].photo} alt={venue.name} />
      <div className="pv-shift-card-body">
        <div className="pv-card-top">
          <span>{areaOf(venue)}</span>
          {label && <Badge good={good}>{label}</Badge>}
        </div>
        <h2>{venue.name}</h2>
        <p className="pv-card-role">{shiftLabel(shift)}</p>
        <p>
          {shift.days.length > 1
            ? datesLabel(shift.days.map((d) => d.date))
            : relativeDay(first.date, data.now)}{" "}
          · {first.start}–{first.end}
        </p>
        {shift.days.length > 1 && (
          <p className="pv-card-days">
            {shift.days.length} days needed
            {shift.together ? " · one person for all of them" : ""}
          </p>
        )}
        <div className="pv-card-foot">
          <strong>
            £{shift.rate}
            <span> / hour</span>
          </strong>
          <ArrowRightIcon size={18} />
        </div>
      </div>
    </button>
  );
}
// A compact, comparable list row for schedules and inboxes.
export function Row({
  photo,
  name,
  title,
  sub,
  status,
  good = false,
  onClick,
  person,
}: {
  photo?: string;
  name: string;
  title: ReactNode;
  sub?: ReactNode;
  status?: string;
  good?: boolean;
  onClick?: () => void;
  person?: Member;
}) {
  if (person) return (
    <div className="pv-row pv-member-row">
      <ProfilePhoto person={person} />
      <div className="pv-row-text">
        <strong><ProfileName person={person} /></strong>
        <button className="pv-row-details" onClick={onClick} aria-label={`View ${name}’s ${status === "Booked" || status === "Past" || status === "Cancelled" ? "booking" : "shift"} details`}>
          <span>{title}</span>
          {sub && <small>{sub}</small>}
          {status && <Badge good={good}>{status}</Badge>}
        </button>
      </div>
      <button className="pv-icon-button" onClick={onClick} aria-label={`View details for ${name}`}><ArrowRightIcon size={18} /></button>
    </div>
  );
  return (
    <button className="pv-row" onClick={onClick}>
      <Photo src={photo} alt={name} />
      <span className="pv-row-text">
        <strong>{title}</strong>
        {sub && <small>{sub}</small>}
        {status && <Badge good={good}>{status}</Badge>}
      </span>
      <ArrowRightIcon size={16} />
    </button>
  );
}
// Keeps the one action that matters within thumb reach on phones.
export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="pv-action-bar">{children}</div>;
}
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="pv-section">
      <h2 className="pv-section-title">{title}</h2>
      {children}
    </section>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="pv-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Segments({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="pv-segments" aria-label="Choose view">
      {options.map((option) => (
        <button
          key={option}
          className={option === value ? "active" : ""}
          onClick={() => onChange(option)}
          aria-pressed={option === value}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
