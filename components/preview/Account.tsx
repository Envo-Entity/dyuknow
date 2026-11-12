"use client";
// Account: what a signed-in member manages for themselves — verification,
// texts, help, and the account itself. Their public profile lives
// on My profile.
import { useRef, useState, type ReactNode } from "react";
import { SHIFT_ALERTS } from "@/lib/catalogue";
import {
  accountOf,
  clockLabel,
  displayDate,
  needsRightToWork,
  RIGHT_TO_WORK,
  type Account,
  type DocStatus,
  type Member,
} from "@/lib/preview/model";
import { navigateRoute } from "@/lib/preview/store";
import { usePreview } from "./context";
import { Badge, Button, Field, Heading, Modal } from "./ui";

// Fictional number range reserved for drama; nothing real is dialled.
const HELP_PHONE = "+44 20 7946 0000";
const HELP_EMAIL = "help@dyuknow.example";

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="pv-account-card" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className="pv-toggle">
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
    </label>
  );
}
// Documents are optional, so a missing one is neutral, not a warning.
const DOC_LABEL: Record<DocStatus, string> = {
  verified: "Verified",
  review: "Added",
  missing: "Not added",
};

// The upload flow: a hidden file input, opened for one document at a time.
function useDocUpload() {
  const { actor, act, live } = usePreview();
  const input = useRef<HTMLInputElement>(null);
  const [doc, setDoc] = useState("");
  const pick = (name: string) => {
    setDoc(name);
    input.current?.click();
  };
  // The demo keeps only the file's name; the real app uploads the file.
  const field = (
    <input
      ref={input}
      type="file"
      accept={live ? "image/jpeg,image/png,application/pdf" : "image/*,application/pdf"}
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file && doc)
          act(
            { type: "upload-doc", actor, doc, file: file.name, blob: live ? file : undefined },
            `${doc} added.`,
          );
        e.target.value = "";
      }}
    />
  );
  return { pick, field };
}

// Talent without a right to work document: a gentle nudge on Profile and Account.
export function RightToWorkNudge({ me }: { me: Member }) {
  const { live } = usePreview();
  const upload = useDocUpload();
  if (!needsRightToWork(me, live?.rejected)) return null;
  return (
    <div className="pv-callout pv-nudge">
      <p>
        Add your right to work. Venues can see whether you’ve added it, and it gives you a better
        chance of being booked.
      </p>
      <Button onClick={() => upload.pick(RIGHT_TO_WORK)}>Upload</Button>
      {upload.field}
    </div>
  );
}

export function AccountPage() {
  const { me, live } = usePreview();
  if (!me) return null;
  return (
    <>
      <Heading title="Account" />
      <nav className="pv-account-index" aria-label="Account sections">
        {[
          ["verification", me.side === "venue" ? "Verification" : "Documents"],
          live ? ["notifications", "Notifications"] : ["texts", "Texts"],
          ["help", "Help"],
          ["details", "Account"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={(e) => {
            e.preventDefault();
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}>
            {label}
          </a>
        ))}
      </nav>
      <RightToWorkNudge me={me} />
      <div className="pv-account-cards">
        <Verification me={me} />
        {live ? <LiveNotices me={me} /> : <Texts me={me} />}
        <Help />
        <Details me={me} />
      </div>
    </>
  );
}

function Verification({ me }: { me: Member }) {
  const { live } = usePreview();
  const upload = useDocUpload();
  const docs = accountOf(me).docs;
  return (
    <Card id="verification" title={me.side === "venue" ? "Business verification" : "Documents"}>
      <p className="pv-muted">
        {me.side === "venue"
          ? "Optional. Your profile shows a tick once Dyuknow has checked one, never the file."
          : "Optional. Venues see which ones you’ve added and which Dyuknow has checked, never the file. Your CV stays private."}
      </p>
      <div className="pv-doc-list">
        {Object.entries(docs).map(([name, d]) => {
          // Real app only: Dyuknow looked at the file and didn't accept it.
          const rejected = live && name in live.rejected ? live.rejected[name] : undefined;
          return (
          <div key={name} className={`pv-doc is-${d.status}`}>
            <span>
              <strong>{name}</strong>
              <small>
                {rejected !== undefined
                  ? `${rejected ? `${rejected.replace(/[.!\s]+$/, "")}. ` : ""}Upload a new one.`
                  : d.status === "verified"
                  ? `Checked ${d.updated ? displayDate(d.updated.slice(0, 10)) : ""}`
                  : d.status === "review"
                    ? `${d.file} · not checked yet`
                    : live
                      ? "Upload a JPEG, PNG or PDF"
                      : "Upload a photo or PDF"}
              </small>
            </span>
            <Badge good={d.status === "verified"} attention={rejected !== undefined}>
              {rejected !== undefined ? "Not accepted" : DOC_LABEL[d.status]}
            </Badge>
            <Button
              variant={d.status === "missing" ? "primary" : "secondary"}
              onClick={() => upload.pick(name)}
            >
              {d.status === "missing" && rejected === undefined ? "Upload" : "Replace"}
            </Button>
          </div>
          );
        })}
      </div>
      {upload.field}
    </Card>
  );
}

function Texts({ me }: { me: Member }) {
  const { actor, side, act } = usePreview();
  const a = accountOf(me);
  const set = (patch: Partial<Account>) => act({ type: "account", actor, patch }, "Saved.");
  return (
    <Card id="texts" title="Texts">
      <p className="pv-muted">
        Texts go to <strong>{me.phone}</strong>.
      </p>
      <div className="pv-toggle-list">
        <Toggle
          label="Bookings"
          hint={
            side === "talent"
              ? "Booking requests, bookings and cancellations"
              : "Accepted, declined, changes and cancellations"
          }
          checked
          disabled
        />
        {side === "talent" ? (
          <label className="pv-toggle">
            <span>
              <strong>New job posts</strong>
              <small>In your positions</small>
            </span>
            <select
              value={me.alert}
              onChange={(e) =>
                act(
                  { type: "profile", actor, patch: { alert: e.target.value as Member["alert"] } },
                  "Saved.",
                )
              }
            >
              {SHIFT_ALERTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Toggle
          label="Messages"
          checked={a.texts.messages}
          onChange={(messages) => set({ texts: { ...a.texts, messages } })}
        />
        {side === "talent" && (
          <Toggle
            label="Reminders"
            hint="The evening before, with the address"
            checked={a.texts.reminders}
            onChange={(reminders) => set({ texts: { ...a.texts, reminders } })}
          />
        )}
      </div>
    </Card>
  );
}

// Real app: notices live in the app, on the bell. Only talent have a setting.
function LiveNotices({ me }: { me: Member }) {
  const { actor, side, act } = usePreview();
  return (
    <Card id="notifications" title="Notifications">
      <p className="pv-muted">Notices show in the app, on the bell.</p>
      {side === "talent" && (
        <div className="pv-toggle-list">
          <label className="pv-toggle">
            <span>
              <strong>New job posts</strong>
              <small>In your positions</small>
            </span>
            <select
              value={me.alert}
              onChange={(e) =>
                act(
                  { type: "profile", actor, patch: { alert: e.target.value as Member["alert"] } },
                  "Saved.",
                )
              }
            >
              {SHIFT_ALERTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </Card>
  );
}

function Help() {
  const { live } = usePreview();
  return (
    <Card id="help" title="Help">
      <div className="pv-help-links">
        <a href={`tel:${HELP_PHONE.replace(/\s/g, "")}`}>
          <small>{live ? "Call" : "Call or text"}</small>
          <strong>{HELP_PHONE}</strong>
        </a>
        <a href={`mailto:${HELP_EMAIL}`}>
          <small>Email</small>
          <strong>{HELP_EMAIL}</strong>
        </a>
      </div>
    </Card>
  );
}

function Details({ me }: { me: Member }) {
  const { actor, act, data, toast, live } = usePreview();
  const a = accountOf(me);
  const [phone, setPhone] = useState<{ number: string; code: string; step: 1 | 2 } | null>(null);
  const [del, setDel] = useState(false);
  return (
    <Card id="details" title="Account">
      {live ? (
        <div className="pv-pay-row">
          <span>
            <small>Email</small>
            <strong>{live.email}</strong>
          </span>
        </div>
      ) : (
        <div className="pv-pay-row">
          <span>
            <small>Phone</small>
            <strong>{me.phone}</strong>
          </span>
          <Button variant="secondary" onClick={() => setPhone({ number: "", code: "", step: 1 })}>
            Change
          </Button>
        </div>
      )}
      <div className="pv-account-actions">
        <Button variant="secondary" onClick={() => (live ? live.logout() : navigateRoute("/"))}>
          Log out
        </Button>
        {a.deletion ? (
          <p className="pv-muted">
            Deletion requested {clockLabel(a.deletion)}.{" "}
            {live ? "Dyuknow will be in touch to confirm." : "Dyuknow will confirm by text."}{" "}
            <button
              className="pv-text-link"
              onClick={() => act({ type: "delete-account", actor, cancel: true }, "Deletion request withdrawn.")}
            >
              Keep my account
            </button>
          </p>
        ) : (
          <Button variant="quiet" className="pv-danger-text" onClick={() => setDel(true)}>
            Delete account
          </Button>
        )}
      </div>
      {phone && (
        <Modal title="Change phone number" onClose={() => setPhone(null)}>
          {phone.step === 1 ? (
            <>
              <Field label="New phone number">
                <input
                  type="tel"
                  value={phone.number}
                  placeholder="+44 7700 900000"
                  onChange={(e) => setPhone({ ...phone, number: e.target.value })}
                />
              </Field>
              <Button
                disabled={phone.number.replace(/\D/g, "").length < 10}
                onClick={() => setPhone({ ...phone, step: 2 })}
              >
                Text me a code
              </Button>
            </>
          ) : (
            <>
              <p>Preview code: 123456.</p>
              <Field label="Code">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={phone.code}
                  onChange={(e) => setPhone({ ...phone, code: e.target.value })}
                />
              </Field>
              <Button
                disabled={phone.code.length !== 6}
                onClick={async () => {
                  if (phone.code !== "123456") return toast("That code doesn’t match. Use 123456.");
                  if (data.members.some((m) => m.id !== actor && m.phone.replace(/\D/g, "") === phone.number.replace(/\D/g, "")))
                    return toast("That number belongs to another member.");
                  if (await act({ type: "profile", actor, patch: { phone: phone.number.trim() } }, "Phone number changed."))
                    setPhone(null);
                }}
              >
                Confirm
              </Button>
            </>
          )}
        </Modal>
      )}
      {del && (
        <Modal title="Delete your account?" onClose={() => setDel(false)}>
          <p>
            Upcoming bookings stay until they’re done or cancelled. Dyuknow removes your profile and
            documents, then {live ? "gets in touch to confirm" : "confirms by text"}.
          </p>
          <Button
            variant="danger"
            onClick={async () => {
              if (await act({ type: "delete-account", actor }, "Deletion requested.")) setDel(false);
            }}
          >
            Request deletion
          </Button>
          <Button variant="quiet" onClick={() => setDel(false)}>
            Keep my account
          </Button>
        </Modal>
      )}
    </Card>
  );
}
