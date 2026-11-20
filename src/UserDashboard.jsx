import { useEffect, useState } from "react";
import { api } from "./api.js";
import RequestStatusTabs from "./RequestStatusTabs.jsx";
import { approvedSlotLabel } from "./approved-slot.js";
import { canCancel, statusLabel } from "./request-status.js";
import { formatPhone } from "./center-phone.js";
import { groupCode } from "./request-code.js";
import "./approval-slots.css";

const tabs = [
  ["all", "Requests"],
  ["profile", "My profile"],
];
const contrastWords = { without: "without contrast", with: "with contrast", both: "without and with contrast" };
const examLine = (item) => {
  const service = item.service && !/^please contact me$/i.test(item.service) ? item.service : "";
  return [[service, item.exam].filter(Boolean).join(" "), contrastWords[item.contrast] || ""].filter(Boolean).join(" ") || "Exam not listed";
};
const slotText = (slot) =>
  new Date(slot.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
  " " + slot.period;
const timeOf = (value) => new Date(value * 1000).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const ago = (value) => {
  const days = Math.floor((Date.now() / 1000 - value) / 86400);
  if (days >= 1) return days === 1 ? "1 day ago" : `${days} days ago`;
  const hours = Math.floor((Date.now() / 1000 - value) / 3600);
  return hours >= 1 ? (hours === 1 ? "1 hour ago" : `${hours} hours ago`) : "just now";
};
const zones = {
  "America/New_York": "Eastern",
  "America/Chicago": "Central",
  "America/Denver": "Mountain",
  "America/Phoenix": "Arizona",
  "America/Los_Angeles": "Pacific",
  "America/Anchorage": "Alaska",
  "Pacific/Honolulu": "Hawaii",
};
const dateLabel = (value) =>
  new Date(value + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
const stamp = (value) =>
  new Date(value * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4m10-4v4M3 11h18" />
    </svg>
  );
}
function RequestCard({ item, onChanged }) {
  const [asking, setAsking] = useState(false),
    [busy, setBusy] = useState(false),
    [problem, setProblem] = useState("");
  async function cancel() {
    setBusy(true);
    setProblem("");
    try {
      await api("/booking/cancel", { id: item.id });
      setAsking(false);
      onChanged();
    } catch (e) {
      setProblem(e.message || "We could not cancel this request. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const phone = String(item.clinic_phone || "").replace(/[^+0-9]/g, "");
  return (
    <article className="dashboard-request reference-dashboard-request">
      <div className="reference-dashboard-title">
        <h3>{item.clinic_name}</h3>
        <span className="request-code">
          <span className="request-id">{groupCode(item.id)}</span>
          <button type="button" className="link-button request-copy" aria-label={`Copy reference code ${item.id}`} onClick={() => navigator.clipboard?.writeText(item.id)}>
            Copy
          </button>
        </span>
      </div>
      <p className="reference-dashboard-exam">{examLine(item)}</p>
      {item.price_text && <p className="reference-dashboard-price">{item.price_text}</p>}
      <p className="reference-dashboard-slots">
        {item.slots.map(slotText).join(" · ")}
      </p>
      <span className={`request-status status-${item.status}`}>
        <span aria-hidden="true" className="status-dot" />
        {statusLabel(item)}
      </span>
      <p className="reference-dashboard-sent">
        Sent {stamp(item.created)} ({ago(item.created)})
        {["requested", "voicemail"].includes(item.status) && Date.now() / 1000 - item.created > 4 * 86400 && (
          <> · No answer yet. <a href="#search">Find another facility</a></>
        )}
      </p>
      {item.status === "scheduled" && (
        <div className="approved-appointment">
          <strong>Time confirmed</strong>
          <p>{approvedSlotLabel(item.approved_slot)}</p>
          {item.approved_slot?.source === "custom" && (
            <p>
              The facility chose a different time than your preferred windows.
              Call the facility if it does not work for you.
            </p>
          )}
        </div>
      )}
      <details className="dashboard-request-details">
        <summary>Full request details</summary>
        <div className="request-slot-heading">
          <CalendarIcon />
          <span>Preferred times</span>
          <small>
            {zones[item.timezone] ? zones[item.timezone] + " time" : ""}
          </small>
        </div>
        <div className="request-slot-list">
          {item.slots.map((slot) => (
            <div className="request-slot-chip" key={slot.date + slot.period}>
              <strong>{dateLabel(slot.date)}</strong>
              <span>
                {slot.period === "morning"
                  ? "Morning · 8 am–12 pm"
                  : "Afternoon · 12–5 pm"}
              </span>
            </div>
          ))}
        </div>
        <dl>
          <dt>Location</dt>
          <dd>{item.location || "Confirm with the facility"}</dd>
          <dt>Patient</dt>
          <dd>{item.contact_name || "—"}</dd>
          <dt>Mobile</dt>
          <dd>{item.contact_phone ? formatPhone(item.contact_phone) : "Not provided"}</dd>
          <dt>Contrast</dt>
          <dd>
            {{
              unknown: "Not specified",
              without: "Without contrast",
              with: "With contrast",
              both: "Without and with contrast",
            }[item.contrast] || "Not specified"}
          </dd>
          <dt>Price</dt>
          <dd>{item.price_text}</dd>
          <dt>Submitted</dt>
          <dd>{stamp(item.created)}</dd>
          <dt>Sent to the facility</dt>
          <dd>{item.delivery || "Pending"}</dd>
          {item.approved_at && (
            <>
              <dt>Confirmed</dt>
              <dd>{stamp(item.approved_at)}</dd>
            </>
          )}
        </dl>
      </details>
      <div className="request-card-footer">
        <a
          className="flow-dark request-open"
          href={`#request/${encodeURIComponent(item.id)}/${encodeURIComponent(item.tracking_token)}`}
        >
          Open request
        </a>
        {phone.length >= 8 && (
          <a className="flow-outline" href={`tel:${phone}`}>
            Call the facility
          </a>
        )}
        {canCancel(item) && !asking && (
          <button type="button" className="link-button request-cancel-link" onClick={() => setAsking(true)}>
            Cancel request
          </button>
        )}
      </div>
      {canCancel(item) && (asking || problem) && (
        <div className="request-cancel">
          {asking && (
            <>
              <p>Cancel this request? {item.clinic_name} is told it is closed.</p>
              <div className="request-cancel-actions">
                <button type="button" className="flow-dark" disabled={busy} onClick={cancel}>
                  Yes, cancel request
                </button>
                <button type="button" className="flow-outline" disabled={busy} onClick={() => setAsking(false)}>
                  Keep it
                </button>
              </div>
            </>
          )}
          {problem && <p role="alert" className="flow-error">{problem}</p>}
        </div>
      )}
    </article>
  );
}
function ForgetMe({ onForgotten }) {
  const [step, setStep] = useState("idle"),
    [challenge, setChallenge] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [problem, setProblem] = useState("");
  async function send() {
    setBusy(true);
    setProblem("");
    try {
      const sent = await api("/account/forget", {});
      setChallenge(sent.verification_id);
      setStep("code");
    } catch (e) {
      setProblem(e.message || "We could not text a code. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function confirm(event) {
    event.preventDefault();
    setBusy(true);
    setProblem("");
    try {
      await api("/account/forget", { verification_id: challenge, code: code.trim() });
      onForgotten();
    } catch (e) {
      setProblem(e.message || "That code did not work. Please try again.");
      setBusy(false);
    }
  }
  return (
    <section className="forget-me" aria-labelledby="forgetTitle">
      <h3 id="forgetTitle">Forget me</h3>
      <p>
        Delete your account and every request now. We tell facilities about any open request.
        This cannot be undone.
      </p>
      {step === "idle" && (
        <button type="button" className="flow-outline" disabled={busy} onClick={() => setStep("ask")}>
          Forget me
        </button>
      )}
      {step === "ask" && (
        <div className="request-cancel-actions">
          <button type="button" className="flow-dark" disabled={busy} onClick={send}>
            Text me a code
          </button>
          <button type="button" className="flow-outline" disabled={busy} onClick={() => setStep("idle")}>
            Keep my account
          </button>
        </div>
      )}
      {step === "code" && (
        <form onSubmit={confirm} className="forget-code">
          <label htmlFor="forgetCode">6-digit code we texted you</label>
          <input id="forgetCode" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="request-cancel-actions">
            <button type="submit" className="flow-dark" disabled={busy || code.trim().length < 4}>
              Delete my account
            </button>
            <button type="button" className="flow-outline" disabled={busy} onClick={() => setStep("idle")}>
              Keep my account
            </button>
          </div>
        </form>
      )}
      {problem && <p role="alert" className="flow-error">{problem}</p>}
    </section>
  );
}
function takeRequestedTab() {
  try {
    const wanted = sessionStorage.getItem("msp-dashboard-tab");
    sessionStorage.removeItem("msp-dashboard-tab");
    return wanted === "profile" ? "profile" : "all";
  } catch {
    return "all";
  }
}
export default function UserDashboard({ account, onForgotten }) {
  const [tab, setTab] = useState(() => takeRequestedTab()),
    [page, setPage] = useState(1),
    [value, setValue] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0),
    [updated, setUpdated] = useState(null);
  useEffect(() => {
    const pick = () => setTab(takeRequestedTab());
    window.addEventListener("msp-dashboard-tab", pick);
    return () => window.removeEventListener("msp-dashboard-tab", pick);
  }, []);
  const signedIn = account && account.tenant !== "guest";
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    const load = async () => {
      try {
        const next = await api(
          `/dashboard?page=${page}&filter=${["open", "approved", "closed"].includes(tab) ? tab : "all"}`,
        );
        if (active) {
          setValue(next);
          setError("");
          setUpdated(new Date());
        }
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    setLoading(true);
    void load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [signedIn, account?.id, tab, page, refresh]);
  if (!signedIn)
    return (
      <section className="panel account-page">
        <h1>Your dashboard</h1>
        <p>Log in to view your profile and appointment requests.</p>
        <a className="button" href="#login">
          Log in
        </a>
      </section>
    );
  const select = (next) => {
    setTab(next);
    setPage(1);
  };
  const stats = value?.stats || {},
    open = (stats.requested || 0) + (stats.voicemail || 0),
    total = Object.values(stats).reduce((a, b) => a + b, 0);
  const phoneIdentity = value?.profile.phone || account.phone;
  const firstName = String(value?.profile.name || account.name || "").trim().split(/\s+/)[0] || "";
  const name = firstName || (phoneIdentity ? formatPhone(phoneIdentity) : "Your account");
  const initials = /^[A-Za-z]/.test(firstName) ? firstName[0].toUpperCase() : "A";
  return (
    <section className="user-dashboard" aria-busy={loading}>
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="dashboard-account-mini">
            <span className="dashboard-avatar" aria-hidden="true">
              {initials}
            </span>
            <div>
              <strong>{name}</strong>
              <span>{phoneIdentity ? `${firstName ? formatPhone(phoneIdentity) + " · " : ""}Verified` : "Personal account"}</span>
            </div>
          </div>
          <nav className="dashboard-tabs" aria-label="Dashboard sections">
            {tabs.map(([key, label]) => (
              <button
                type="button"
                key={key}
                aria-label={label}
                aria-current={
                  tab === key ||
                  (key === "all" && ["open", "approved"].includes(tab))
                    ? "page"
                    : undefined
                }
                onClick={() => select(key)}
              >
                {label}
                {key === "all" && <span>{total}</span>}
              </button>
            ))}
          </nav>
        </aside>
        <div className="dashboard-content">
          <div className="dashboard-heading dashboard-welcome">
            <div>
              <p className="eyebrow">MYSELFPAY ACCOUNT</p>
              <h1>{tab === "profile" ? "My profile" : "My requests"}</h1>
              {tab === "profile" && <p className="muted">Your saved account information</p>}
            </div>
            <a className="dashboard-search" href="#search">
              Find facilities <span aria-hidden="true">→</span>
            </a>
          </div>

          {error && (
            <div className="dashboard-error" role="alert">
              {error}
              <button type="button" onClick={() => setRefresh((n) => n + 1)}>
                Try again
              </button>
            </div>
          )}
          {loading && !value && (
            <p role="status" className="dashboard-loading">
              Loading your dashboard…
            </p>
          )}
          {value && (
            <>
              {tab === "profile" ? (
                <section className="dashboard-profile">
                  <div className="profile-heading">
                    <span className="dashboard-avatar" aria-hidden="true">
                      {initials}
                    </span>
                    <div>
                      <h2>{firstName || "Your account"}</h2>
                      <p>Verified mobile number</p>
                    </div>
                  </div>
                  <dl>
                    {[
                      ...(value.profile.name
                        ? [["Name", value.profile.name]]
                        : []),
                      ["Mobile number", value.profile.phone ? formatPhone(value.profile.phone) : "Not provided"],
                      ["Home ZIP (so results start near you)", value.profile.zip_code || "Not provided"],
                      [
                        "Joined",
                        new Date(
                          value.profile.created * 1000,
                        ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                      ],
                    ].map(([label, text]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{text}</dd>
                      </div>
                    ))}
                  </dl>
                  <ForgetMe onForgotten={onForgotten} />
                </section>
              ) : (
                <section className="dashboard-requests">
                  <div className="dashboard-request-heading">
                    <span className="dashboard-updated" role="status">
                      {updated ? `Updated ${updated.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : ""}
                    </span>
                    <button
                      type="button"
                      className="link-button"
                      disabled={loading}
                      onClick={() => setRefresh((n) => n + 1)}
                    >
                      Refresh
                    </button>
                  </div>
                  <RequestStatusTabs
                    value={tab}
                    counts={{
                      all: total,
                      open,
                      approved: stats.scheduled || 0,
                      closed: Math.max(0, total - open - (stats.scheduled || 0)),
                    }}
                    onChange={select}
                    confirmedLabel="Time confirmed"
                    disabled={loading}
                  />
                  {!value.requests.length && (
                    <div className="dashboard-empty">
                      <span className="dashboard-empty-icon" aria-hidden="true">
                        <CalendarIcon />
                      </span>
                      <h3>
                        {tab === "open"
                          ? "No open requests"
                          : tab === "approved"
                            ? "No confirmed requests"
                            : tab === "closed"
                              ? "No closed requests"
                              : "No requests yet"}
                      </h3>
                      <p>
                        Your appointment requests and updates will appear here.
                      </p>
                      <a className="dashboard-search" href="#search">
                        Browse facilities
                      </a>
                    </div>
                  )}
                  <div className="dashboard-request-list">
                    {value.requests.map((item) => (
                      <RequestCard key={item.id} item={item} onChanged={() => setRefresh((n) => n + 1)} />
                    ))}
                  </div>
                  {value.pages > 1 && (
                    <div className="dashboard-pagination">
                      <button
                        type="button"
                        disabled={loading || value.page <= 1}
                        onClick={() => setPage(value.page - 1)}
                      >
                        Previous
                      </button>
                      <span>
                        Page {value.page} of {value.pages}
                      </span>
                      <button
                        type="button"
                        disabled={loading || value.page >= value.pages}
                        onClick={() => setPage(value.page + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                  <p className="dashboard-refresh-note">
                    The facility confirms your time when it calls.
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
