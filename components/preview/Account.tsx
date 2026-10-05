"use client";
// Account: what a signed-in member manages for themselves — verification,
// texts, payments, help, and the account itself. Their public profile lives
// on My profile.
import { useRef, useState, type ReactNode } from "react";
import { SHIFT_ALERTS } from "@/lib/catalogue";
import {
  accountOf,
  bookingServices,
  clockLabel,
  datesLabel,
  displayDate,
  hoursOf,
  member,
  shiftLabel,
  type Account,
  type DocStatus,
  type Member,
} from "@/lib/preview/model";
import { navigateRoute } from "@/lib/preview/store";
import { usePreview } from "./context";
import { TimeSelect } from "./Booking";
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
const DOC_LABEL: Record<DocStatus, string> = {
  verified: "Verified",
  review: "Being checked",
  missing: "Needed",
};

export function AccountPage() {
  const { me } = usePreview();
  if (!me) return null;
  return (
    <>
      <Heading title="Account" />
      <nav className="pv-account-index" aria-label="Account sections">
        {[
          ["verification", "Verification"],
          ["texts", "Texts"],
          ["payments", "Payments"],
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
      <div className="pv-account-cards">
        <Verification me={me} />
        <Texts me={me} />
        <Payments me={me} />
        <Help />
        <Details me={me} />
      </div>
    </>
  );
}

function Verification({ me }: { me: Member }) {
  const { actor, act } = usePreview();
  const input = useRef<HTMLInputElement>(null);
  const [doc, setDoc] = useState("");
  const docs = accountOf(me).docs;
  const done = Object.values(docs).filter((d) => d.status === "verified").length;
  return (
    <Card id="verification" title={me.side === "venue" ? "Business verification" : "Verification"}>
      <p className="pv-muted">
        {done} of {Object.keys(docs).length} verified. Verified documents show as ticks on your
        profile; the files themselves stay private.
      </p>
      <div className="pv-doc-list">
        {Object.entries(docs).map(([name, d]) => (
          <div key={name} className={`pv-doc is-${d.status}`}>
            <span>
              <strong>{name}</strong>
              <small>
                {d.status === "verified"
                  ? `Checked ${d.updated ? displayDate(d.updated.slice(0, 10)) : ""}`
                  : d.status === "review"
                    ? `${d.file} · usually within a day`
                    : "Upload a photo or PDF"}
              </small>
            </span>
            <Badge good={d.status === "verified"} attention={d.status === "missing"}>
              {DOC_LABEL[d.status]}
            </Badge>
            <Button
              variant={d.status === "missing" ? "primary" : "secondary"}
              onClick={() => {
                setDoc(name);
                input.current?.click();
              }}
            >
              {d.status === "missing" ? "Upload" : "Replace"}
            </Button>
          </div>
        ))}
      </div>
      {/* The preview keeps only the file's name; nothing leaves the browser. */}
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && doc)
            act({ type: "upload-doc", actor, doc, file: file.name }, `${doc} sent to Dyuknow to check.`);
          e.target.value = "";
        }}
      />
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
        Sent to <strong>{me.phone}</strong>. Change it under Account.
      </p>
      <div className="pv-toggle-list">
        <Toggle
          label="Bookings"
          hint={
            side === "talent"
              ? "Booking requests, invitations, changes and cancellations"
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
        ) : (
          <Toggle
            label="Replies to job posts"
            hint="When someone says they can cover"
            checked={a.texts.replies}
            onChange={(replies) => set({ texts: { ...a.texts, replies } })}
          />
        )}
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
        <Toggle
          label="Quiet hours"
          hint="Hold texts overnight. Same-day bookings still come through."
          checked={a.quiet.on}
          onChange={(on) => set({ quiet: { ...a.quiet, on } })}
        />
        {a.quiet.on && (
          <div className="pv-time-pair">
            <TimeSelect
              label="From"
              value={a.quiet.start}
              onChange={(start) => set({ quiet: { ...a.quiet, start } })}
            />
            <TimeSelect
              label="To"
              value={a.quiet.end}
              onChange={(end) => set({ quiet: { ...a.quiet, end } })}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function Payments({ me }: { me: Member }) {
  const { data, actor, side, act } = usePreview();
  const a = accountOf(me);
  const [edit, setEdit] = useState(false);
  const [payout, setPayout] = useState({ holder: me.name, sortCode: "", account: "" });
  const [billing, setBilling] = useState(a.billing ?? { company: me.name, email: me.email, vat: "" });
  // Worked services, newest first: what was earned or what's owed.
  const worked = data.bookings
    .filter((b) => {
      const s = data.shifts.find((x) => x.id === b.shift)!;
      return !b.cancelled && (side === "talent" ? b.talent === actor : s.venue === actor) &&
        bookingServices(data, b).at(-1)!.to <= data.now;
    })
    .map((b) => {
      const s = data.shifts.find((x) => x.id === b.shift)!;
      const days = bookingServices(data, b);
      return {
        id: b.id,
        who: member(data, side === "talent" ? s.venue : b.talent).name,
        what: `${shiftLabel(s)} · ${datesLabel(b.days)}`,
        amount: Math.round(days.reduce((t, d) => t + hoursOf(d) * s.rate, 0)),
      };
    });
  return (
    <Card id="payments" title="Payments">
      {side === "talent" ? (
        a.payout && !edit ? (
          <div className="pv-pay-row">
            <span>
              <small>Paid to</small>
              <strong>
                {a.payout.holder} · {a.payout.sortCode} · ••••{a.payout.last4}
              </strong>
            </span>
            <Button variant="secondary" onClick={() => setEdit(true)}>
              Change
            </Button>
          </div>
        ) : (
          <div className="pv-pay-form">
            <Field label="Name on the account">
              <input value={payout.holder} onChange={(e) => setPayout({ ...payout, holder: e.target.value })} />
            </Field>
            <div className="pv-form-grid">
              <Field label="Sort code">
                <input
                  inputMode="numeric"
                  placeholder="12-34-56"
                  value={payout.sortCode}
                  onChange={(e) => setPayout({ ...payout, sortCode: e.target.value })}
                />
              </Field>
              <Field label="Account number">
                <input
                  inputMode="numeric"
                  maxLength={8}
                  value={payout.account}
                  onChange={(e) => setPayout({ ...payout, account: e.target.value.replace(/\D/g, "") })}
                />
              </Field>
            </div>
            <div className="pv-actions">
              <Button
                disabled={payout.account.length !== 8 || !payout.holder.trim()}
                onClick={() => {
                  if (
                    act(
                      {
                        type: "account",
                        actor,
                        patch: {
                          payout: {
                            holder: payout.holder.trim(),
                            sortCode: payout.sortCode,
                            last4: payout.account.slice(-4),
                          },
                        },
                      },
                      "Bank details saved.",
                    )
                  )
                    setEdit(false);
                }}
              >
                Save bank details
              </Button>
              {a.payout && (
                <Button variant="quiet" onClick={() => setEdit(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="pv-pay-form">
          <div className="pv-form-grid">
            <Field label="Company name">
              <input value={billing.company} onChange={(e) => setBilling({ ...billing, company: e.target.value })} />
            </Field>
            <Field label="Invoices go to">
              <input type="email" value={billing.email} onChange={(e) => setBilling({ ...billing, email: e.target.value })} />
            </Field>
            <Field label="VAT number · optional">
              <input value={billing.vat} onChange={(e) => setBilling({ ...billing, vat: e.target.value })} />
            </Field>
          </div>
          <Button
            variant="secondary"
            onClick={() => act({ type: "account", actor, patch: { billing } }, "Billing details saved.")}
          >
            Save billing details
          </Button>
        </div>
      )}
      <h3>{side === "talent" ? "Earnings" : "Invoices"}</h3>
      {worked.length ? (
        <div className="pv-pay-list">
          {worked.map((w) => (
            <div key={w.id}>
              <span>
                <strong>{w.who}</strong>
                <small>{w.what}</small>
              </span>
              <strong>£{w.amount}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="pv-muted">Nothing yet.</p>
      )}
    </Card>
  );
}

function Help() {
  const { actor, act } = usePreview();
  const [text, setText] = useState("");
  return (
    <Card id="help" title="Help">
      <div className="pv-help-links">
        <a href={`tel:${HELP_PHONE.replace(/\s/g, "")}`}>
          <small>Call or text</small>
          <strong>{HELP_PHONE}</strong>
        </a>
        <a href={`mailto:${HELP_EMAIL}`}>
          <small>Email</small>
          <strong>{HELP_EMAIL}</strong>
        </a>
      </div>
      <Field label="Or tell us here">
        <textarea
          rows={3}
          value={text}
          placeholder="What happened?"
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <Button
        variant="secondary"
        disabled={!text.trim()}
        onClick={() => {
          if (act({ type: "help", actor, text }, "Sent. Dyuknow will text you back.")) setText("");
        }}
      >
        Send to Dyuknow
      </Button>
    </Card>
  );
}

function Details({ me }: { me: Member }) {
  const { actor, act, data, toast } = usePreview();
  const a = accountOf(me);
  const [phone, setPhone] = useState<{ number: string; code: string; step: 1 | 2 } | null>(null);
  const [email, setEmail] = useState(me.email);
  const [del, setDel] = useState(false);
  return (
    <Card id="details" title="Account">
      <div className="pv-pay-row">
        <span>
          <small>Phone · how you sign in</small>
          <strong>{me.phone}</strong>
        </span>
        <Button variant="secondary" onClick={() => setPhone({ number: "", code: "", step: 1 })}>
          Change
        </Button>
      </div>
      <div className="pv-inline">
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button
          variant="secondary"
          disabled={email === me.email || !/^\S+@\S+\.\S+$/.test(email)}
          onClick={() => act({ type: "profile", actor, patch: { email } }, "Email saved.")}
        >
          Save
        </Button>
      </div>
      <div className="pv-account-actions">
        <Button variant="secondary" onClick={() => navigateRoute("/")}>
          Log out
        </Button>
        {a.deletion ? (
          <p className="pv-muted">
            Deletion requested {clockLabel(a.deletion)}. Dyuknow will confirm by text.{" "}
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
                onClick={() => {
                  if (phone.code !== "123456") return toast("That code doesn’t match. Use 123456.");
                  if (data.members.some((m) => m.id !== actor && m.phone.replace(/\D/g, "") === phone.number.replace(/\D/g, "")))
                    return toast("That number belongs to another member.");
                  if (act({ type: "profile", actor, patch: { phone: phone.number.trim() } }, "Phone number changed."))
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
            documents, then confirms by text.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              if (act({ type: "delete-account", actor }, "Deletion requested.")) setDel(false);
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
