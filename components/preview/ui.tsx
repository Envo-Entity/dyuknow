"use client";
import {
  useEffect,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from "@/components/icons";
import {
  FAMILIES,
  serviceLabel,
  shiftLabel,
  type Shift,
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
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="pv-empty">
      <h2>{title}</h2>
      <p>{text}</p>
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
export function Services({ shift }: { shift: Shift }) {
  return (
    <div className="pv-services">
      {shift.days.map((day) => (
        <p key={day.date}>{serviceLabel(day)}</p>
      ))}
      <small>
        All times Europe/London
        {shift.days.length > 1
          ? ` · Same person for all ${shift.days.length} days`
          : ""}
      </small>
    </div>
  );
}
export function ShiftCard({
  shift,
  label,
  onClick,
}: {
  shift: Shift;
  label?: string;
  onClick?: () => void;
}) {
  const { data, go } = usePreview();
  const venue = data.members.find((m) => m.id === shift.venue)!;
  return (
    <button
      className="pv-shift-card"
      onClick={onClick || (() => go(`shift/${shift.id}`))}
    >
      <Photo src={FAMILIES[shift.family].photo} />
      <div className="pv-shift-card-body">
        <div className="pv-card-top">
          <span>
            {venue.name} · {venue.area}
          </span>
          <Badge good={label === "Booked"}>
            {label || (shift.status === "open" ? "Open shift" : shift.status)}
          </Badge>
        </div>
        <h2>{shiftLabel(shift)}</h2>
        <p>{serviceLabel(shift.days[0])}</p>
        <div className="pv-card-foot">
          <strong>
            £{shift.rate}
            <span> / hour</span>
          </strong>
          <span>
            {shift.days.length > 1 ? `${shift.days.length} dates · ` : ""}
            {shift.capacity} {shift.capacity === 1 ? "person" : "people"}
            <ArrowRightIcon size={18} />
          </span>
        </div>
      </div>
    </button>
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
