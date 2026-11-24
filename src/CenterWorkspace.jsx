import { useEffect, useRef, useState } from "react";
import { writeCenterSession } from "./account-menu.js";
import MemberSidebar, { centerGroups } from "./MemberSidebar.jsx";
import { centerAPI as call } from "./center-api.js";
import "./center-workspace.css";
import ApprovalSlotPicker from "./ApprovalSlotPicker.jsx";
import { approvedSlotLabel, approvalReady } from "./approved-slot.js";
import { storedPrices } from "./directory-offer.js";

function Icon({ name, ...props }) {
  const paths = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    inbox: (
      <>
        <path d="M4 4h16l2 12v4H2v-4L4 4Z" />
        <path d="M2 15h6l2 3h4l2-3h6" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    requests: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4" />
      </>
    ),
    building: (
      <>
        <path d="M4 21V3h16v18M2 21h20M9 21v-5h6v5M8 7h2m4 0h2M8 11h2m4 0h2" />
      </>
    ),
    exit: (
      <>
        <path d="M9 4H4v16h5m5-12 4 4-4 4M9 12h12" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7V3m0 4h-4M4 17v4m0-4h4M5 8a8 8 0 0 1 14-3m0 11a8 8 0 0 1-14 3" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    back: <path d="M20 12H4m6-6-6 6 6 6" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 2v6m10-6v6M3 11h18M7 15h3m4 0h3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6l4 2" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
    phone: (
      <path d="m6 3 4 4-2 3a15 15 0 0 0 6 6l3-2 4 4-2 3C10 22 2 14 3 5l3-2Z" />
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 8a2.5 2.5 0 1 1 4 2.5c-1.5 1-1.5 1.5-1.5 3M12 17h.01" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
const labels = {
  requested: "New",
  voicemail: "Left a message",
  scheduled: "Time confirmed",
  unable: "Can’t schedule",
  expired: "Expired",
  cancelled: "Cancelled by patient",
};
const statusWords = (item) =>
  item.status === "cancelled" && item.closed_reason === "scheduled_elsewhere"
    ? "Closed: patient scheduled elsewhere"
    : labels[item.status] || item.status;
const REASONS = [
  ["no_openings", "No openings in those windows"],
  ["not_offered", "We don’t offer this exam"],
  ["other", "Other"],
];
const prettyPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  const local = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  return local.length === 10
    ? `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
    : String(value || "");
};
const CLOSED = ["unable", "expired", "cancelled"];
const isClosed = (item) => CLOSED.includes(item.status);
const slotLine = (slots = []) =>
  slots
    .map((slot) => {
      const d = new Date(`${slot.date}T12:00:00`);
      return `${d.toLocaleDateString(undefined, { weekday: "short" })} ${d.toLocaleDateString(undefined, { month: "short" })} ${d.getDate()} ${slot.period === "morning" ? "morning" : "afternoon"}`;
    })
    .filter(Boolean);
const examName = (item) => {
  const service = String(item.service || "").trim();
  const exam = String(item.exam || "").trim();
  if (/^please contact me/i.test(service) || (!service && !exam)) return "Exam not listed";
  if (exam && service && exam.toLowerCase().startsWith(service.toLowerCase())) return exam;
  return [service, exam].filter(Boolean).join(" ");
};
const waitWords = (seconds) => {
  if (seconds === null || seconds === undefined) return "";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return `${days} days`;
};
const ago = (stamp) => {
  if (!stamp) return "";
  const days = Math.floor((Date.now() / 1000 - stamp) / 86400);
  return days <= 0 ? "Received today" : days === 1 ? "Received 1 day ago" : `Received ${days} days ago`;
};
const examLine = (request) =>
  [
    [request.service, request.exam].filter(Boolean).join(" "),
    { without: "without contrast", with: "with contrast", both: "without and with contrast" }[request.contrast],
  ]
    .filter(Boolean)
    .join(" ");
const chosenSlot = (request, choice) => {
  if (!choice) return null;
  if (choice.preferred_index !== undefined) {
    const slot = request.slots?.[choice.preferred_index];
    return slot ? { ...slot, timezone: request.timezone, source: "preferred" } : null;
  }
  return choice.date && choice.time
    ? { date: choice.date, time: choice.time, timezone: request.timezone, source: "custom" }
    : null;
};
const zones = {
  "America/New_York": "Eastern time",
  "America/Chicago": "Central time",
  "America/Denver": "Mountain time",
  "America/Phoenix": "Arizona time",
  "America/Los_Angeles": "Pacific time",
  "America/Anchorage": "Alaska time",
  "Pacific/Honolulu": "Hawaii time",
};
const isOpen = (item) => ["requested", "voicemail"].includes(item.status);
const formatDate = (date) =>
  date
    ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "Not provided";
const received = (stamp) =>
  stamp
    ? new Date(stamp * 1000).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not provided";
const period = (slot) =>
  slot.period === "morning" ? "Morning · 8 am–12 pm" : "Afternoon · 12–5 pm";
const titles = {
  open: "Inbox",
  approved: "Inbox",
  closed: "Inbox",
  all: "Inbox",
  profile: "Center profiles",
  prices: "Self-pay prices",
};
function Badge({ status, item }) {
  return (
    <span className={`cw-badge cw-status-${status}`}>
      <i />
      {item ? statusWords(item) : labels[status] || status}
    </span>
  );
}
function Empty({ title, description, onReset }) {
  return (
    <div className="cw-empty">
      <span className="cw-empty-icon">
        <Icon name="inbox" width="28" height="28" />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {onReset && (
        <button type="button" onClick={onReset}>
          Clear filters
        </button>
      )}
    </div>
  );
}
const CONTRAST_LABEL = {
  unknown: "Contrast not specified",
  without: "Without contrast",
  with: "With contrast",
  either: "Same price with or without contrast",
};
const READING_LABEL = {
  unknown: "Reading not specified",
  yes: "Reading included",
  no: "Reading billed separately",
};
const OTHER_EXAMS = ["Ultrasound", "X-ray"];
const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const day = (stamp) =>
  stamp
    ? new Date(stamp * 1000).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

export function PriceForm({ center, submissions, live = [], onSaved }) {
  const mine = live.filter((item) => item.entry_key === center.id),
    liveFor = (exam, contrast) =>
      mine.find((item) => item.exam === exam && item.contrast === contrast),
    rows = [
      ["without", "Without contrast"],
      ["with", "With contrast"],
      ["either", "Same price with or without contrast"],
      ...(mine.some(
        (item) =>
          item.contrast === "unknown" && ["MRI", "CT"].includes(item.exam),
      )
        ? [["unknown", "Contrast not specified"]]
        : []),
    ],
    cell = (exam, contrast) =>
      liveFor(exam, contrast)
        ? (liveFor(exam, contrast).amount_cents / 100).toFixed(2)
        : "";
  const [amounts, setAmounts] = useState(() =>
      Object.fromEntries([
        ...["MRI", "CT"].flatMap((exam) =>
          rows.map(([c]) => [`${exam}:${c}`, cell(exam, c)]),
        ),
        ...OTHER_EXAMS.map((exam) => [
          `${exam}:unknown`,
          cell(exam, "unknown"),
        ]),
      ]),
    ),
    [reading, setReading] = useState(
      mine[0]?.interpretation_included || "unknown",
    ),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState("");
  const pending = submissions.filter(
    (item) => item.entry_key === center.id && item.status === "pending",
  );
  const valid = (value) => /^\d{1,5}(\.\d{1,2})?$/.test(value.trim());
  const entries = Object.entries(amounts).filter(([, v]) => v.trim()),
    prices = entries.map(([key, value]) => {
      const [exam, contrast] = key.split(":");
      return {
        exam,
        amount: value.trim(),
        price_type: liveFor(exam, contrast)?.price_type || "fixed",
        contrast,
        interpretation_included: reading,
      };
    });
  const ready =
    consent && prices.length > 0 && entries.every(([, v]) => valid(v));
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setDone("");
    try {
      const value = await call("price", { id: center.id, consent, prices });
      setDone(
        value.message || "Thank you. Your prices will appear after review.",
      );
      setConsent(false);
      onSaved?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirmPrice(id) {
    setBusy(true);
    setError("");
    try {
      await call("confirm-price", { id });
      onSaved?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const stored = storedPrices(center);
  return (
    <form className="cw-price-form" onSubmit={submit}>
      <h4>{mine.length ? "Update your self-pay prices" : "Self-pay prices"}</h4>
      {stored.length > 0 && (
        <div className="cw-price-live">
          <strong>Shown to patients now</strong>
          <ul>
            {stored.map((item) => (
              <li key={item.service}>
                <b>{item.service}</b> {item.text}
              </li>
            ))}
          </ul>
          <p>
            Enter a new price below to change what patients see. The current
            price stays until your new price is approved.
          </p>
        </div>
      )}
      {mine.length > 0 && (
        <div className="cw-price-live">
          <strong>Live on your listing</strong>
          <ul>
            {mine.map((item) => (
              <li key={item.id}>
                <b>{item.exam}</b> {money(item.amount_cents)}
                {item.price_type === "from" ? " and up" : ""} ·{" "}
                {OTHER_EXAMS.includes(item.exam)
                  ? ""
                  : `${CONTRAST_LABEL[item.contrast] || CONTRAST_LABEL.unknown} · `}
                {READING_LABEL[item.interpretation_included] ||
                  READING_LABEL.unknown}
                {item.confirmed ? (
                  ` · confirmed by you ${item.updated ? day(item.updated) : item.confirmed}`
                ) : (
                  <>
                    {" · "}
                    <em>
                      Found on{" "}
                      {/^https:\/\//.test(item.source || "") ? (
                        <a href={item.source} target="_blank" rel="noreferrer">
                          your website
                        </a>
                      ) : (
                        "your website"
                      )}
                      . Confirm or correct it.
                    </em>{" "}
                    <button
                      type="button"
                      className="cw-edit-button"
                      disabled={busy}
                      onClick={() => confirmPrice(item.id)}
                    >
                      Confirm price
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p>
        {mine.length
          ? "Change a price below and send it. The new price goes live after review. The current price stays until then."
          : "Enter the price a patient pays without insurance. Prices appear on your listing with the date after review."}
      </p>
      <div className="cw-price-grid">
        <table className="cw-price-table">
          <thead>
            <tr>
              <th>Exam</th>
              {rows.map(([c, label]) => (
                <th key={c}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {["MRI", "CT", ...OTHER_EXAMS].map((exam) => (
              <tr key={exam}>
                <th scope="row">{exam}</th>
                {rows.map(([c, label]) => {
                  const single = OTHER_EXAMS.includes(exam);
                  if (single && c !== "either") return <td key={c}>—</td>;
                  const key = `${exam}:${single ? "unknown" : c}`;
                  return (
                    <td key={c}>
                      <span className="cw-money">
                        <i>$</i>
                        <input
                          inputMode="decimal"
                          aria-label={`${exam} ${single ? "price" : label}`}
                          value={amounts[key] || ""}
                          disabled={busy}
                          onChange={(e) =>
                            setAmounts({ ...amounts, [key]: e.target.value })
                          }
                        />
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="cw-price-hint">
          Use one box per exam. If the price is the same with and without
          contrast, use the last column. Ultrasound and X-ray have one price.
        </p>
      </div>
      <label className="cw-price-reading">
        Radiologist reading, for all prices above
        <select
          value={reading}
          disabled={busy}
          onChange={(e) => setReading(e.target.value)}
        >
          <option value="unknown">Not specified</option>
          <option value="yes">Included in the price</option>
          <option value="no">Billed separately</option>
        </select>
      </label>
      <label className="cw-price-consent">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(e) => setConsent(e.target.checked)}
        />
        These are our current self-pay prices. Show them on our listing.
      </label>
      {error && (
        <p className="center-error" role="alert">
          {error}
        </p>
      )}
      {done && <p role="status">{done}</p>}
      {pending.length > 0 && (
        <p className="cw-price-pending">
          Waiting for review:{" "}
          {pending
            .map(
              (item) =>
                `${item.exam}${
                  OTHER_EXAMS.includes(item.exam) || item.contrast === "unknown"
                    ? ""
                    : ` ${(CONTRAST_LABEL[item.contrast] || "").toLowerCase()}`
                } ${money(item.amount_cents)}`,
            )
            .join(", ")}
          {pending[0]?.submitted ? ` · sent ${day(pending[0].submitted)}` : ""}
        </p>
      )}
      <button className="primary" disabled={busy || !ready}>
        {busy
          ? "Please wait…"
          : "Submit prices for review"}
      </button>
      <p className="cw-subtle">We review within 1 business day.</p>
    </form>
  );
}

function ContactEditor({ field, current, entryId, onDone }) {
  const isEmail = field === "email",
    [step, setStep] = useState("view"),
    [value, setValue] = useState(current || ""),
    [ident, setIdent] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function cancel() {
    setStep("view");
    setValue(current || "");
    setCode("");
    setError("");
  }
  async function send(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await call("contact", {
        field,
        value: value.trim(),
        ...(isEmail ? {} : { id: entryId }),
      });
      setIdent(result.verification_id);
      setCode("");
      setStep("code");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await call("contact-verify", {
        verification_id: ident,
        code: code.trim(),
      });
      setStep("view");
      onDone?.(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const noun = isEmail ? "login email" : "phone number";
  if (step === "view")
    return (
      <span className="cw-contact-view">
        <span>{current || "Not listed"}</span>
        <button
          type="button"
          className="cw-edit-button"
          aria-label={isEmail ? "Edit login email" : "Edit phone number"}
          onClick={() => setStep("edit")}
        >
          {isEmail ? "Edit email" : current ? "Edit phone" : "Add phone"}
        </button>
      </span>
    );
  return (
    <form
      className="cw-contact-form"
      onSubmit={step === "edit" ? send : confirm}
    >
      {step === "edit" ? (
        <>
          <label>
            New {noun}
            <input
              type={isEmail ? "email" : "tel"}
              value={value}
              disabled={busy}
              autoComplete={isEmail ? "email" : "tel"}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <p>
            {isEmail
              ? `You are changing your login email${current ? ` from ${current}` : ""}. We send a code to the new email. After you confirm, you sign in with the new email.`
              : `You are changing the phone number for this listing${current ? ` from ${current}` : ""}. We text a code to the new number. Include the country code, such as +1.`}
          </p>
        </>
      ) : (
        <>
          <label>
            Code sent to {value.trim()}
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              disabled={busy}
              autoComplete="one-time-code"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <p>Enter the 6-digit code to confirm the change of your {noun}.</p>
        </>
      )}
      {error && (
        <p className="center-error" role="alert">
          {error}
        </p>
      )}
      <span className="cw-contact-actions">
        <button
          className="primary"
          disabled={
            busy ||
            (step === "edit"
              ? !value.trim() || value.trim() === current
              : code.length !== 6)
          }
        >
          {busy
            ? "Please wait…"
            : step === "edit"
              ? "Send code"
              : "Confirm change"}
        </button>
        <button type="button" disabled={busy} onClick={cancel}>
          Cancel
        </button>
      </span>
    </form>
  );
}

function ProfileFieldEditor({ center, field, current, pending, onDone }) {
  const isSite = field === "website",
    label = isSite ? "website" : "address",
    [editing, setEditing] = useState(false),
    [value, setValue] = useState(current || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function send(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await call("profile", {
        id: center.id,
        field,
        value: value.trim(),
      });
      setEditing(false);
      onDone?.(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!editing)
    return (
      <span className="cw-contact-view">
        <span>{current || "Not listed"}</span>
        <button
          type="button"
          className="cw-edit-button"
          aria-label={`${current ? "Edit" : "Add"} ${label}`}
          onClick={() => {
            setValue(pending?.value || current || "");
            setEditing(true);
          }}
        >
          {current ? `Edit ${label}` : `Add ${label}`}
        </button>
        {pending && (
          <span className="cw-pending-note">
            Waiting for review: {pending.value}
            {pending.submitted ? ` · sent ${day(pending.submitted)}` : ""}
          </span>
        )}
      </span>
    );
  return (
    <form className="cw-contact-form" onSubmit={send}>
      <label>
        {isSite ? "Website" : "Street address"}
        <input
          type={isSite ? "url" : "text"}
          value={value}
          disabled={busy}
          maxLength={isSite ? 300 : 200}
          placeholder={isSite ? "https://" : "Street, city, state, ZIP"}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <p>
        Patients see this after we review it.
        {isSite ? " The address must start with https://" : ""}
      </p>
      {error && (
        <p className="center-error" role="alert">
          {error}
        </p>
      )}
      <span className="cw-contact-actions">
        <button
          className="primary"
          disabled={busy || !value.trim() || value.trim() === current}
        >
          {busy ? "Please wait…" : "Send for review"}
        </button>
        <button type="button" disabled={busy} onClick={() => setEditing(false)}>
          Cancel
        </button>
      </span>
    </form>
  );
}

function History({
  centers,
  submissions,
  contact,
  profile = [],
  activity = [],
}) {
  const names = Object.fromEntries(centers.map((c) => [c.id, c.name])),
    rows = [
      ...submissions.map((item) => ({
        when: item.submitted,
        kind: "Price",
        center: names[item.entry_key] || "",
        detail: `${item.exam} ${money(item.amount_cents)}${item.price_type === "from" ? " and up" : ""} · ${CONTRAST_LABEL[item.contrast] || ""}`,
        status:
          item.status === "approved"
            ? `Live since ${day(item.decided)}`
            : item.status === "rejected"
              ? `Not accepted ${day(item.decided)}`
              : item.status === "replaced"
                ? "Replaced before review"
                : "Waiting for review",
      })),
      ...profile
        .filter((item) => item.status !== "replaced")
        .map((item) => ({
          when: item.submitted,
          kind: item.field === "website" ? "Website" : "Address",
          center: names[item.entry_key] || "",
          detail: item.value,
          status:
            item.status === "approved"
              ? `Live since ${day(item.decided)}`
              : item.status === "rejected"
                ? `Not accepted ${day(item.decided)}`
                : "Waiting for review",
        })),
      ...contact.map((item) => ({
        when: item.changed,
        kind: item.field === "email" ? "Login email" : "Phone",
        center:
          item.field === "email"
            ? ""
            : item.entry_keys
                .map((k) => names[k])
                .filter(Boolean)
                .join(", "),
        detail: `${item.old_value || "Not listed"} → ${item.new_value}`,
        status: "Changed",
      })),
    ].sort((a, b) => b.when - a.when);
  return (
    <section className="cw-history" aria-label="Change history">
      <h3>History</h3>
      {rows.length === 0 ? (
        <p>
          No changes yet. Price updates and contact changes appear here with
          their dates.
        </p>
      ) : (
        <div className="cw-history-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>What</th>
                <th>Center</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>{day(row.when)}</td>
                  <td>{row.kind}</td>
                  <td>{row.center}</td>
                  <td>{row.detail}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activity.length > 0 && (
        <>
          <h3>Activity on your account</h3>
          <p>
            Every sign-in, price, and profile action on your listings, with the
            time it happened.
          </p>
          <div className="cw-history-scroll">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>What</th>
                  <th>By</th>
                  <th>Before</th>
                  <th>After</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((row, i) => (
                  <tr key={i}>
                    <td>{day(row.when)}</td>
                    <td>{row.what}</td>
                    <td>{row.by}</td>
                    <td>{row.old}</td>
                    <td>{row.new}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Prices({ centers, submissions = [], live = [], onSaved }) {
  return (
    <div className="cw-profiles">
      {centers.map((center) => (
        <article key={center.id} className="cw-profile-card">
          <div className="cw-profile-heading">
            <span className="cw-building">
              <Icon name="building" width="24" height="24" />
            </span>
            <div>
              <h3>{center.name}</h3>
              <p>{center.entity || "Imaging center"}</p>
            </div>
          </div>
          <PriceForm
            key={`${center.id}:${live
              .filter((item) => item.entry_key === center.id)
              .map((item) => `${item.id}:${item.amount_cents}`)
              .join(",")}`}
            center={center}
            submissions={submissions}
            live={live}
            onSaved={onSaved}
          />
        </article>
      ))}
    </div>
  );
}

function RequestInbox({ current, login, onChanged }) {
  const [step, setStep] = useState("view"),
    [address, setAddress] = useState(""),
    [ident, setIdent] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function reset() {
    setStep("view");
    setAddress("");
    setCode("");
    setError("");
  }
  async function run(action, body, done) {
    setBusy(true);
    setError("");
    try {
      done(await call(action, body));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const send = (event) => {
    event.preventDefault();
    run("inbox", { address: address.trim() }, (result) => {
      setIdent(result.verification_id);
      setCode("");
      setStep("code");
    });
  };
  const confirm = (event) => {
    event.preventDefault();
    run("inbox-verify", { verification_id: ident, code: code.trim() }, () => {
      reset();
      onChanged?.("Requests now arrive at " + address.trim() + ".");
    });
  };
  const remove = () =>
    run("inbox-remove", {}, () => {
      reset();
      onChanged?.("Requests arrive at " + login + " again.");
    });
  return (
    <article className="cw-profile-card cw-account-card">
      <h3>Where should patient requests go?</h3>
      {step === "view" ? (
        <>
          <p>
            New requests arrive at <strong>{current || login}</strong>. Choose a
            shared inbox, such as your scheduling desk, and we send it a test
            message first.
          </p>
          {error && (
            <p className="center-error" role="alert">
              {error}
            </p>
          )}
          <span className="cw-contact-actions">
            <button type="button" onClick={() => setStep("edit")}>
              {current ? "Change inbox" : "Choose an inbox"}
            </button>
            {current && (
              <button type="button" disabled={busy} onClick={remove}>
                Use {login}
              </button>
            )}
          </span>
        </>
      ) : (
        <form
          className="cw-contact-form"
          onSubmit={step === "edit" ? send : confirm}
        >
          {step === "edit" ? (
            <label>
              Request inbox email
              <input
                type="email"
                value={address}
                disabled={busy}
                autoComplete="email"
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
          ) : (
            <>
              <label>
                Code from the test message sent to {address.trim()}
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  disabled={busy}
                  autoComplete="one-time-code"
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              <p>Open the test message and enter the 6-digit code.</p>
            </>
          )}
          {error && (
            <p className="center-error" role="alert">
              {error}
            </p>
          )}
          <span className="cw-contact-actions">
            <button
              className="primary"
              disabled={
                busy || (step === "edit" ? !address.trim() : code.length !== 6)
              }
            >
              {busy
                ? "Please wait…"
                : step === "edit"
                  ? "Send a test"
                  : "Confirm inbox"}
            </button>
            <button type="button" disabled={busy} onClick={reset}>
              Cancel
            </button>
          </span>
        </form>
      )}
    </article>
  );
}

function Profile({
  centers,
  email,
  submissions = [],
  live = [],
  contact = [],
  profile = [],
  inbox = "",
  onSaved,
  onEmailChanged,
  onOpenPrices,
  activity = [],
}) {
  const [showHistory, setShowHistory] = useState(false),
    [note, setNote] = useState("");
  return (
    <div className="cw-profiles">
      <div className="cw-section-title">
        <div>
          <h2>Your directory profiles</h2>
          <p>Center information linked to your verified email.</p>
        </div>
        <button
          type="button"
          className="cw-history-button"
          aria-expanded={showHistory}
          onClick={() => setShowHistory((v) => !v)}
        >
          History
        </button>
        <a className="cw-text-link" href="/contact">
          Request a change <Icon name="arrow" />
        </a>
      </div>
      {showHistory && (
        <History
          centers={centers}
          submissions={submissions}
          contact={contact}
          profile={profile}
          activity={activity}
        />
      )}
      {note && (
        <p className="cw-success" role="status">
          <Icon name="check" />
          {note}
        </p>
      )}
      <article className="cw-profile-card cw-account-card">
        <h3>Login email</h3>
        <p>
          You sign in with this email. Changing it updates every listing that
          uses it.
        </p>
        <ContactEditor field="email" current={email} onDone={onEmailChanged} />
      </article>
      <RequestInbox
        current={inbox}
        login={email}
        onChanged={(text) => {
          setNote(text);
          onSaved?.();
        }}
      />
      {centers.map((center) => (
        <article key={center.id} className="cw-profile-card">
          <div className="cw-profile-heading">
            <span className="cw-building">
              <Icon name="building" width="24" height="24" />
            </span>
            <div>
              <h3>{center.name}</h3>
              <p>
                {center.entity || "Imaging center"}
                {center.area ? ` · ${center.area}` : ""}
              </p>
            </div>
            {center.is_test_center && (
              <span className="cw-test-label">Test center</span>
            )}
          </div>
          <dl className="cw-profile-fields">
            <div>
              <dt>Directory email</dt>
              <dd>{center.email || email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                <ContactEditor
                  field="phone"
                  current={center.phone}
                  entryId={center.id}
                  onDone={(result) => {
                    setNote(result.message || "Your phone number is updated.");
                    onSaved?.();
                  }}
                />
              </dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>
                <ProfileFieldEditor
                  center={center}
                  field="address"
                  current={center.address}
                  pending={profile.find(
                    (p) =>
                      p.entry_key === center.id &&
                      p.field === "address" &&
                      p.status === "pending",
                  )}
                  onDone={(result) => {
                    setNote(result.message || "Sent for review.");
                    onSaved?.();
                  }}
                />
              </dd>
            </div>
            {(center.coverage || center.area) && (
              <div>
                <dt>Coverage</dt>
                <dd>{center.coverage || center.area}</dd>
              </div>
            )}
            <div>
              <dt>Website</dt>
              <dd>
                <ProfileFieldEditor
                  center={center}
                  field="website"
                  current={center.source}
                  pending={profile.find(
                    (p) =>
                      p.entry_key === center.id &&
                      p.field === "website" &&
                      p.status === "pending",
                  )}
                  onDone={(result) => {
                    setNote(result.message || "Sent for review.");
                    onSaved?.();
                  }}
                />
              </dd>
            </div>
          </dl>
          {[
            ["mri", "MRI"],
            ["ct", "CT"],
            ["other", "Other services"],
          ].some(([key]) => center[key]) && (
            <div className="cw-profile-services">
              <h4>Services &amp; published information</h4>
              {[
                ["mri", "MRI"],
                ["ct", "CT"],
                ["other", "Other services"],
              ].map(([key, label]) =>
                center[key] ? (
                  <p key={key}>
                    <strong>{label}</strong>
                    <span>{center[key]}</span>
                  </p>
                ) : null,
              )}
            </div>
          )}
          <p className="cw-profile-prices-link">
            <button type="button" onClick={onOpenPrices}>
              Go to self-pay prices
            </button>
          </p>
        </article>
      ))}
    </div>
  );
}
function Records({ request, busy, onSave }) {
  const [note, setNote] = useState(request.note || ""),
    [order, setOrder] = useState(!!request.order_received),
    [done, setDone] = useState(request.exam_completed || "");
  useEffect(() => {
    setNote(request.note || "");
    setOrder(!!request.order_received);
    setDone(request.exam_completed || "");
  }, [request.id, request.note, request.order_received, request.exam_completed]);
  const changed =
    note !== (request.note || "") ||
    order !== !!request.order_received ||
    done !== (request.exam_completed || "");
  return (
    <section className="cw-records" aria-labelledby="recordsTitle">
      <h3 id="recordsTitle">Your records</h3>
      <p className="cw-subtle">Only your staff see these. Patients do not.</p>
      <label className="cw-check">
        <input
          type="checkbox"
          checked={order}
          disabled={busy}
          onChange={(e) => setOrder(e.target.checked)}
        />
        Order received <span className="cw-subtle">({request.id})</span>
      </label>
      <label htmlFor="centerNote">Note</label>
      <textarea
        id="centerNote"
        rows={3}
        maxLength={500}
        value={note}
        disabled={busy}
        onChange={(e) => setNote(e.target.value)}
      />
      {request.status === "scheduled" && (
        <>
          <label htmlFor="examDone">Exam completed on</label>
          <input
            id="examDone"
            type="date"
            value={done}
            disabled={busy}
            onChange={(e) => setDone(e.target.value)}
          />
        </>
      )}
      <button
        type="button"
        disabled={busy || !changed}
        onClick={() =>
          onSave(request.id, {
            note,
            order_received: order,
            ...(done && done !== (request.exam_completed || "") ? { exam_completed: done } : {}),
          })
        }
      >
        Save records
      </button>
    </section>
  );
}
function RequestDetail({ request, busy, onBack, onAction, onSave }) {
  const [appointment, setAppointment] = useState(null),
    [reason, setReason] = useState("no_openings"),
    [declining, setDeclining] = useState(false);
  useEffect(() => {
    setAppointment(null);
    setDeclining(false);
  }, [request.id]);
  const phoneHref = String(request.phone || "").replace(/[^+0-9]/g, "");
  const picked = chosenSlot(request, appointment);
  return (
    <div className="cw-detail">
      <button
        type="button"
        className="cw-back"
        disabled={busy}
        onClick={onBack}
      >
        <Icon name="back" />
        Back to inbox
      </button>
      <div className="cw-detail-title">
        <div>
          <p className="cw-kicker">APPOINTMENT REQUEST</p>
          <h2>{request.clinic_name}</h2>
          <p className="cw-subtle">
            {request.id} · Received {received(request.created)}
          </p>
        </div>
        <Badge status={request.status} item={request} />
      </div>
      <div className="cw-detail-grid">
        <section className="cw-detail-main">
          {request.status === "scheduled" && (
            <div className="approved-appointment">
              <strong>Approved appointment</strong>
              <p>{approvedSlotLabel(request.approved_slot)}</p>
            </div>
          )}
          <div className="cw-panel-heading">
            <Icon name="calendar" />
            <h3>Preferred appointment times</h3>
          </div>
          <p className="cw-subtle">
            {zones[request.timezone] || request.timezone}. The center confirms
            availability directly.
          </p>
          {!request.contact_hidden ? (
            <ApprovalSlotPicker
              request={request}
              value={appointment}
              onChange={setAppointment}
              disabled={busy}
            />
          ) : (
            <div className="cw-time-options">
              {(request.slots || []).map((slot, index) => (
                <div key={`${slot.date}-${slot.period}`}>
                  <span className="cw-slot-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{formatDate(slot.date)}</strong>
                    <span>{period(slot)}</span>
                  </div>
                  <Icon name="clock" />
                </div>
              ))}
            </div>
          )}
          <section className="cw-price-note">
            <span>Exam</span>
            <p>
              {examLine(request) || "Exam not specified"}
              {request.price_text ? ` · Listed price ${request.price_text}` : ""}
            </p>
            <p className="cw-subtle">
              Confirm the final price with the patient when you call.
            </p>
          </section>
        </section>
        <aside className="cw-contact">
          <div className="cw-panel-heading">
            <Icon name={request.contact_hidden ? "lock" : "mail"} />
            <h3>Patient contact</h3>
          </div>
          {request.contact_hidden ? (
            <div className="cw-privacy">
              <p>Request closed. Patient contact details are hidden.</p>
              <span>
                You can still review the request status and preferred times.
              </span>
            </div>
          ) : (
            <>
              <p className="cw-patient-name">
                {request.first_name || "Patient"}
              </p>
              <dl>
                <div>
                  <dt>Mobile number</dt>
                  <dd>
                    {request.phone ? (
                      <a className="cw-call" href={`tel:${phoneHref}`}>
                        <Icon name="phone" />
                        Call {prettyPhone(request.phone)}
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </aside>
      </div>
      {request.status !== "expired" && (
        <Records request={request} busy={busy} onSave={onSave} />
      )}
      {!request.contact_hidden && (
        <section className="cw-decision">
          <div>
            <h3>Call the patient, then record the time</h3>
            <p>
              Pick one of the patient’s windows or another time. The patient
              sees the result in My requests.
            </p>
            {picked && (
              <p className="cw-preview">
                The patient will see: “Your {[request.service, request.exam].filter(Boolean).join(" ") || "exam"} at{" "}
                {request.clinic_name} is set for {approvedSlotLabel(picked)}.”
              </p>
            )}
            {!approvalReady(appointment) && (
              <p className="cw-subtle">Pick a time above to confirm.</p>
            )}
          </div>
          <div className="cw-decision-actions">
            <button
              type="button"
              className="cw-primary"
              disabled={busy || !approvalReady(appointment)}
              onClick={() => onAction(request.id, "scheduled", appointment)}
            >
              <Icon name="check" />
              Confirm time
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction(request.id, "voicemail")}
            >
              Left a message
            </button>
            {declining ? (
              <span className="cw-reason">
                <label htmlFor="cantReason">Reason</label>
                <select
                  id="cantReason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {REASONS.map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="cw-decline"
                  disabled={busy}
                  onClick={() => onAction(request.id, "unable", null, reason)}
                >
                  Send: can’t schedule
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="cw-decline"
                disabled={busy}
                onClick={() => setDeclining(true)}
              >
                Can’t schedule
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
export default function CenterWorkspace({ onLogin, embedded = false, initialTab = "open" }) {
  const [sideOpen, setSideOpen] = useState(false);
  useEffect(() => {
    const flip = () => setSideOpen((open) => !open);
    window.addEventListener("msp-side-toggle", flip);
    return () => window.removeEventListener("msp-side-toggle", flip);
  }, []);
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState("");
  const [tab, setTab] = useState(initialTab),
    [request, setRequest] = useState(null),
    [query, setQuery] = useState(""),
    [center, setCenter] = useState("all"),
    [sort, setSort] = useState("oldest"),
    [page, setPage] = useState(0),
    [updated, setUpdated] = useState(null);
  const sequence = useRef(0),
    detailHeading = useRef(null);
  async function refresh(current = null) {
    const seq = ++sequence.current;
    setBusy(true);
    setError("");
    try {
      const value = await call("dashboard");
      const detail = current ? await call("request", { id: current.id }) : null;
      if (seq !== sequence.current) return;
      setData(value);
      setUpdated(new Date());
      if (current) setRequest(detail);
    } catch (e) {
      if (seq !== sequence.current) return;
      setError(e.message);
      if ([401, 403].includes(e.status)) {
        setData(null);
        setRequest(null);
        writeCenterSession(null);
      }
    } finally {
      if (seq === sequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
    return () => {
      sequence.current++;
    };
  }, []);
  useEffect(() => {
    if (request) detailHeading.current?.focus();
  }, [request?.id]);
  function select(next) {
    if (busy) return;
    setTab(next);
    setRequest(null);
    setPage(0);
    setMessage("");
  }
  async function open(id, status, appointment, reason) {
    const seq = ++sequence.current;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const detail = await call("request", {
        id,
        ...(status ? { status } : {}),
        ...(status === "scheduled" ? { appointment } : {}),
        ...(status === "unable" && reason ? { reason } : {}),
      });
      if (seq !== sequence.current) return;
      setRequest(detail);
      if (status) {
        setMessage(
          status === "scheduled"
            ? "Time confirmed. The patient sees it in My requests."
            : status === "unable"
              ? "Recorded: can’t schedule. The patient sees it in My requests."
              : "Recorded: left a message.",
        );
        setData(await call("dashboard"));
        setUpdated(new Date());
      }
    } catch (e) {
      if (seq === sequence.current) {
        setError(e.message);
        if ([401, 403].includes(e.status)) {
          setData(null);
          setRequest(null);
        }
      }
    } finally {
      if (seq === sequence.current) setBusy(false);
    }
  }
  async function save(id, fields) {
    const seq = ++sequence.current;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const detail = await call("request", { id, ...fields });
      if (seq !== sequence.current) return;
      setRequest(detail);
      setMessage("Saved.");
      setData(await call("dashboard"));
      setUpdated(new Date());
    } catch (e) {
      if (seq === sequence.current) setError(e.message);
    } finally {
      if (seq === sequence.current) setBusy(false);
    }
  }
  const all = data?.requests || [],
    centers = data?.centers || [],
    openCount = all.filter(isOpen).length,
    approved = all.filter((item) => item.status === "scheduled").length,
    closedCount = all.filter(isClosed).length;
  const rows = all
    .filter(
      (item) =>
        (tab === "open"
          ? isOpen(item)
          : tab === "approved"
            ? item.status === "scheduled"
            : tab === "closed"
              ? isClosed(item)
              : true) &&
        (!query.trim() ||
          `${item.id} ${item.first_name || ""} ${item.clinic_name}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())) &&
        (center === "all" || item.clinic_name === center),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? (a.created || 0) - (b.created || 0)
        : (b.created || 0) - (a.created || 0),
    );
  const lastPage = Math.max(0, Math.ceil(rows.length / 10) - 1),
    currentPage = Math.min(page, lastPage),
    visible = rows.slice(currentPage * 10, currentPage * 10 + 10);
  const inboxTabs = ["open", "approved", "closed", "all"];
  const nav = [
    ["open", "Inbox", "inbox", openCount],
    ["prices", "Self-pay prices", "requests", null],
    ["profile", "Center profiles", "building", centers.length],
  ];
  const name = centers.length === 1 ? centers[0].name : "Center workspace",
    initials = (name || "Center")
      .split(/\s+/)
      .map((x) => x[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  useEffect(() => {
    if (data) writeCenterSession({ name });
  }, [data, name]);
  return (
    <section
      className={"center-workspace" + (embedded ? " cw-embedded" : "")}
      aria-busy={busy}
      onSubmit={(e) => e.stopPropagation()}
    >
      {data && !embedded && (
        <>
        {sideOpen && <div className="side-scrim" onClick={() => setSideOpen(false)} />}
        <MemberSidebar
          open={sideOpen}
          onClose={() => setSideOpen(false)}
          groups={centerGroups}
          label="Center menu"
          navLabel="Center dashboard sections"
          initials={initials}
          name={name}
          detail="Verified center account"
          current={inboxTabs.includes(tab) ? `inbox:${tab}` : tab}
          total={{ inbox: openCount, profile: centers.length }}
          onGo={(key) => {
            if (key.startsWith("inbox:")) return select(key.slice(6));
            if (key === "faq") return void document.getElementById("faqLink")?.click();
            if (key === "contact") return void (location.href = "/contact");
            if (key === "signout") return void window.dispatchEvent(new Event("msp-center-signout"));
            select(key);
          }}
        />
        </>
      )}
      <div className={`cw-content${!data ? " cw-content-solo" : ""}`}>
        <header className="cw-page-heading">
          <div>
            <p className="cw-kicker">MYSELFPAY / CENTER PORTAL</p>
            <h1>{request ? "Request details" : titles[tab]}</h1>
            <p className="cw-subtitle">
              {request
                ? "Review the request and coordinate the next step."
                : tab === "prices"
                  ? "Enter or confirm the prices patients pay without insurance."
                  : tab === "profile"
                    ? "Keep your center information close at hand."
                    : "Patient requests for your centers. Call each patient to confirm a time."}
            </p>
          </div>
          {data && (
            <div className="cw-sync">
              <button
                type="button"
                aria-label="Refresh requests"
                disabled={busy}
                onClick={() => refresh(request)}
              >
                <Icon name="refresh" />
                {busy ? "Updating…" : "Refresh"}
              </button>
              <span>
                {updated
                  ? `Updated ${updated.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
                  : "Updating requests"}
              </span>
            </div>
          )}
        </header>
        {error && (
          <div className="cw-error" role="alert">
            <Icon name="help" />
            <p>{error}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => refresh(request)}
            >
              Try again
            </button>
          </div>
        )}
        {message && (
          <p className="cw-success" role="status">
            <Icon name="check" />
            {message}
          </p>
        )}
        {!data ? (
          <div className="cw-access">
            <span className="cw-empty-icon">
              <Icon name="lock" width="30" height="30" />
            </span>
            <h2>
              {busy
                ? "Opening your workspace…"
                : error
                  ? "Your workspace is unavailable"
                  : "Welcome to your center workspace"}
            </h2>
            <p>
              {busy
                ? "Loading your center information and requests."
                : "Log in with the email listed in the directory to manage your center’s requests."}
            </p>
            {!busy && (
              <button type="button" className="cw-primary" onClick={onLogin}>
                Center login <Icon name="arrow" />
              </button>
            )}
          </div>
        ) : request ? (
          <div ref={detailHeading} tabIndex={-1} className="cw-detail-focus">
            <RequestDetail
              request={request}
              busy={busy}
              onBack={() => {
                setRequest(null);
                setMessage("");
              }}
              onAction={open}
              onSave={save}
            />
          </div>
        ) : tab === "prices" ? (
          <Prices
            centers={centers}
            submissions={data.price_submissions || []}
            live={data.live_prices || []}
            onSaved={() => refresh()}
          />
        ) : tab === "profile" ? (
          <Profile
            centers={centers}
            email={data.email}
            submissions={data.price_submissions || []}
            live={data.live_prices || []}
            contact={data.contact_history || []}
            inbox={data.request_inbox || ""}
            profile={data.profile_edits || []}
            activity={data.activity || []}
            onOpenPrices={() => select("prices")}
            onSaved={() => refresh()}
            onEmailChanged={(result) => {
              setData(null);
              setRequest(null);
              setMessage(
                result.message ||
                  "Your login email changed. Sign in again with the new email.",
              );
            }}
          />
        ) : (
          <>
            {openCount > 0 && (
              <div className="cw-attention">
                <span className="cw-attention-icon">
                  <Icon name="inbox" />
                </span>
                <div>
                  <strong>
                    {openCount}{" "}
                    {openCount === 1 ? "request needs" : "requests need"} your
                    attention
                  </strong>
                  <p>Call each patient and record the time.</p>
                </div>
              </div>
            )}
            {data.median_response_seconds !== null &&
              data.median_response_seconds !== undefined && (
                <p className="cw-median">
                  Your median response time:{" "}
                  <strong>{waitWords(data.median_response_seconds)}</strong>
                </p>
              )}
            <div className="cw-counts" role="group" aria-label="Request status">
              {[
                ["open", "New", openCount],
                ["approved", "Time confirmed", approved],
                ["closed", "Closed", closedCount],
                ["all", "Total", all.length],
              ].map(([key, label, count]) => (
                <button
                  type="button"
                  key={key}
                  aria-pressed={tab === key}
                  disabled={busy}
                  onClick={() => select(key)}
                >
                  {label} <strong>{count}</strong>
                </button>
              ))}
            </div>
            <section className="cw-request-panel">
              <div className="cw-section-title">
                <div>
                  <h2>
                    {{ open: "New requests", approved: "Time confirmed", closed: "Closed requests", all: "All requests" }[tab]}
                  </h2>
                  <p>
                    {rows.length} {rows.length === 1 ? "request" : "requests"}
                    {query || center !== "all" ? " matching your filters" : ""}
                  </p>
                </div>
              </div>
              <div className="cw-toolbar">
                <label className="cw-search">
                  <Icon name="search" />
                  <input
                    type="search"
                    aria-label="Search requests"
                    placeholder="Search by reference or patient name"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(0);
                    }}
                  />
                </label>
                <div className="cw-filter-controls">
                  {centers.length > 1 && (
                    <label>
                      <span className="cw-sr-only">Filter by center</span>
                      <select
                        aria-label="Filter by center"
                        value={center}
                        onChange={(e) => {
                          setCenter(e.target.value);
                          setPage(0);
                        }}
                      >
                        <option value="all">All centers</option>
                        {[...new Set(centers.map((item) => item.name))].map(
                          (value) => (
                            <option key={value}>{value}</option>
                          ),
                        )}
                      </select>
                    </label>
                  )}
                  <label>
                    <span className="cw-sr-only">Sort requests</span>
                    <select
                      aria-label="Sort requests"
                      value={sort}
                      onChange={(e) => {
                        setSort(e.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                    </select>
                  </label>
                </div>
              </div>
              {!rows.length ? (
                <Empty
                  title={
                    query || center !== "all"
                      ? "No matching requests"
                      : !all.length
                        ? "No requests yet"
                        : tab === "open"
                          ? "You’re all caught up"
                          : "No requests in this view"
                  }
                  description={
                    query || center !== "all"
                      ? "Try a different reference or name."
                      : "Appointment requests for your centers will appear here."
                  }
                  onReset={
                    query || center !== "all"
                      ? () => {
                          setQuery("");
                          setCenter("all");
                          setPage(0);
                        }
                      : null
                  }
                />
              ) : (
                <>
                  <div
                    className="cw-table"
                    role="table"
                    aria-label="Appointment requests"
                  >
                    <div className="cw-table-head" role="row">
                      <span role="columnheader">Patient</span>
                      <span role="columnheader">Exam and times</span>
                      <span role="columnheader">Received</span>
                      <span role="columnheader">Status</span>
                      <span role="columnheader" className="cw-sr-only">
                        Action
                      </span>
                    </div>
                    <div role="rowgroup">
                      {visible.map((item) => (
                        <article
                          role="row"
                          className="cw-table-row"
                          key={item.id}
                        >
                          <div role="cell" className="cw-reference">
                            <h3>{item.first_name || "Patient"}</h3>
                            {item.phone && <span>{prettyPhone(item.phone)}</span>}
                            <span>
                              {item.id}
                              {centers.length > 1 ? ` · ${item.clinic_name}` : ""}
                            </span>
                          </div>
                          <div role="cell" className="cw-preferences">
                            <Icon name="calendar" />
                            <div>
                              <strong>
                                {examName(item)}
                              </strong>
                              {item.status === "scheduled" ? (
                                <span>{approvedSlotLabel(item.approved_slot)}</span>
                              ) : item.slots?.length ? (
                                <span className="cw-slot-lines">{slotLine(item.slots).map((line) => <span key={line}>{line}</span>)}</span>
                              ) : (
                                <span>Times not provided</span>
                              )}
                            </div>
                          </div>
                          <div role="cell" className="cw-received">
                            <span className="cw-mobile-label">Received</span>
                            {received(item.created)}
                            <small>{ago(item.created)}</small>
                          </div>
                          <div role="cell">
                            <Badge status={item.status} item={item} />
                          </div>
                          <div role="cell" className="cw-row-action">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => open(item.id)}
                            >
                              {isOpen(item) ? "View and respond" : "View"}{" "}
                              <span aria-hidden="true">→</span>
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                  {lastPage > 0 && (
                  <div className="cw-pagination">
                    <span>
                      Showing {currentPage * 10 + 1}–
                      {Math.min(rows.length, (currentPage + 1) * 10)} of{" "}
                      {rows.length}
                    </span>
                    <div>
                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={currentPage === 0}
                        onClick={() => setPage(currentPage - 1)}
                      >
                        Previous
                      </button>
                      <span>
                        {currentPage + 1} / {lastPage + 1}
                      </span>
                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={currentPage >= lastPage}
                        onClick={() => setPage(currentPage + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  )}
                </>
              )}
            </section>
            <p className="cw-workspace-note">
              <Icon name="lock" width="15" height="15" />
              Only requests associated with your verified center email appear in
              this workspace.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
