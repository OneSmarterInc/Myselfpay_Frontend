import { useEffect, useState } from "react";
import { api } from "./api.js";

const labels = {
  requested: "Awaiting center confirmation",
  voicemail: "Center follow-up in progress",
  scheduled: "Approved by center",
  unable: "Center unable to schedule",
  expired: "Request expired",
};
const tabs = [
  ["overview", "Overview"],
  ["profile", "My profile"],
  ["open", "Open requests"],
  ["approved", "Approved requests"],
  ["all", "All requests"],
];
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
function RequestCard({ item }) {
  const phone = String(item.clinic_phone || "").replace(/[^+0-9]/g, "");
  return (
    <article className="dashboard-request reference-dashboard-request">
      <div className="reference-dashboard-title">
        <h3>{item.clinic_name}</h3>
        <span className="request-id">{item.id}</span>
      </div>
      <p className="reference-dashboard-exam">
        {[item.service, item.exam].filter(Boolean).join(" · ")}
        {item.price_text ? ` · ${item.price_text}` : ""}
      </p>
      <span className={`request-status status-${item.status}`}>
        <span aria-hidden="true" className="status-dot" />
        {labels[item.status] || item.status}
      </span>
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
          <dd>{item.location || "Confirm with center"}</dd>
          <dt>Patient</dt>
          <dd>{item.contact_name || "—"}</dd>
          <dt>Email</dt>
          <dd>{item.contact_email || "—"}</dd>
          <dt>Mobile</dt>
          <dd>{item.contact_phone || "Not provided"}</dd>
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
          <dt>Email delivery</dt>
          <dd>{item.delivery || "Pending"}</dd>
          {item.approved_at && (
            <>
              <dt>Approved</dt>
              <dd>{stamp(item.approved_at)}</dd>
            </>
          )}
        </dl>
      </details>
      <div className="request-card-footer">
        {item.secure_chat_url && (
          <a className="flow-outline" href={item.secure_chat_url} target="_blank" rel="noopener noreferrer">Open secure chat</a>
        )}
        {item.secure_chat_status === "pending" && (
          <span role="status">Your secure chat is being prepared. Refresh shortly.</span>
        )}
        {phone.length >= 8 && (
          <a className="flow-outline" href={`tel:${phone}`}>
            Call center
          </a>
        )}
        <a
          className="flow-outline"
          href={`#request/${encodeURIComponent(item.id)}/${encodeURIComponent(item.tracking_token)}`}
        >
          Open request
        </a>
      </div>
    </article>
  );
}
export default function UserDashboard({ account }) {
  const [tab, setTab] = useState("overview"),
    [page, setPage] = useState(1),
    [value, setValue] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0);
  const signedIn = account && account.tenant !== "guest";
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    const load = async () => {
      try {
        const next = await api(
          `/dashboard?page=${page}&filter=${tab === "open" ? "open" : tab === "approved" ? "approved" : "all"}`,
        );
        if (active) {
          setValue(next);
          setError("");
        }
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    setLoading(true);
    void load();
    const timer = setInterval(load, 30000);
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
  const name = value?.profile.name || account.name;
  const initials = name
    ?.split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const heading =
    tab === "open"
      ? "Open requests"
      : tab === "approved"
        ? "Approved requests"
        : tab === "overview"
          ? "Recent requests"
          : "All requests";
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
              <span>Personal account</span>
            </div>
          </div>
          <nav className="dashboard-tabs" aria-label="Dashboard sections">
            {tabs.map(([key, label]) => (
              <button
                type="button"
                key={key}
                aria-label={label}
                aria-current={tab === key ? "page" : undefined}
                onClick={() => select(key)}
              >
                {label}
                {key === "open" && <span>{open}</span>}
                {key === "approved" && <span>{stats.scheduled || 0}</span>}
              </button>
            ))}
          </nav>
        </aside>
        <div className="dashboard-content">
      <div className="dashboard-heading dashboard-welcome">
        <div>
          <p className="eyebrow">MYSELFPAY ACCOUNT</p>
          <h1>{tab === "profile" ? "My profile" : "My requests"}</h1>
          <p className="muted">
            Your profile and appointment requests, in one place.
          </p>
        </div>
        <a className="dashboard-search" href="#search">
          Find imaging centers <span aria-hidden="true">→</span>
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
              {tab === "overview" && (
                <div className="dashboard-metrics">
                  {[
                    ["Total requests", total, "all"],
                    ["Open requests", open, "open"],
                    ["Approved", stats.scheduled || 0, "approved"],
                  ].map(([label, count, target]) => (
                    <button
                      type="button"
                      key={label}
                      aria-label={`View ${label.toLowerCase()}`}
                      onClick={() => select(target)}
                    >
                      <span>{label}</span>
                      <strong>{count}</strong>
                      <small>
                        View requests <span aria-hidden="true">→</span>
                      </small>
                    </button>
                  ))}
                </div>
              )}
              {tab === "profile" ? (
                <section className="dashboard-profile">
                  <div className="profile-heading">
                    <span className="dashboard-avatar" aria-hidden="true">
                      {initials}
                    </span>
                    <div>
                      <h2>My profile</h2>
                      <p>Your saved account information</p>
                    </div>
                  </div>
                  <dl>
                    {[
                      ["Name", value.profile.name],
                      ["Account email", value.profile.email],
                      ["Mobile number", value.profile.phone || "Not provided"],
                      ["ZIP code", value.profile.zip_code || "Not provided"],
                      [
                        "Verified booking email",
                        value.verified_email || "Not verified yet",
                      ],
                      [
                        "Member since",
                        new Date(
                          value.profile.created * 1000,
                        ).toLocaleDateString(),
                      ],
                    ].map(([label, text]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{text}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : (
                <section className="dashboard-requests">
                  <div className="dashboard-request-heading">
                    <div>
                      <h2>{heading}</h2>
                      <p>
                        {value.total}{" "}
                        {value.total === 1 ? "request" : "requests"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setRefresh((n) => n + 1)}
                    >
                      Refresh status
                    </button>
                  </div>
                  {!value.requests.length && (
                    <div className="dashboard-empty">
                      <span className="dashboard-empty-icon" aria-hidden="true">
                        <CalendarIcon />
                      </span>
                      <h3>
                        {tab === "open"
                          ? "No open requests"
                          : tab === "approved"
                            ? "No approved requests"
                            : "No requests yet"}
                      </h3>
                      <p>
                        Your appointment requests and updates will appear here.
                      </p>
                      <a className="dashboard-search" href="#search">
                        Browse imaging centers
                      </a>
                    </div>
                  )}
                  <div className="dashboard-request-list">
                    {value.requests.map((item) => (
                      <RequestCard key={item.id} item={item} />
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
                    Statuses refresh automatically. The center confirms your
                    appointment directly.
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
