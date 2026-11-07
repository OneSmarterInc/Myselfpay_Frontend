import { useEffect, useRef, useState } from "react";
import { centerAPI as call } from "./center-api.js";
import "./center-workspace.css";
import RequestStatusTabs from "./RequestStatusTabs.jsx";
import ApprovalSlotPicker from "./ApprovalSlotPicker.jsx";
import { approvedSlotLabel, approvalReady } from "./approved-slot.js";

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
  requested: "Open request",
  voicemail: "Contact attempted",
  scheduled: "Approved",
  unable: "Declined",
  expired: "Expired",
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
  overview: "Center dashboard",
  open: "Requests",
  approved: "Requests",
  all: "Requests",
  profile: "Center profiles",
};
function Badge({ status }) {
  return (
    <span className={`cw-badge cw-status-${status}`}>
      <i />
      {labels[status] || status}
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
function Profile({ centers, email }) {
  return (
    <div className="cw-profiles">
      <div className="cw-section-title">
        <div>
          <h2>Your directory profiles</h2>
          <p>Center information linked to your verified email.</p>
        </div>
        <a className="cw-text-link" href="/contact">
          Request an update <Icon name="arrow" />
        </a>
      </div>
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
              <dd>{center.phone || "Not listed"}</dd>
            </div>
            <div>
              <dt>Location / coverage</dt>
              <dd>
                {center.address ||
                  center.coverage ||
                  center.area ||
                  "Not listed"}
              </dd>
            </div>
            <div>
              <dt>Website</dt>
              <dd>{center.source || "Not listed"}</dd>
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
        </article>
      ))}
    </div>
  );
}
function RequestDetail({ request, busy, onBack, onAction }) {
  const [appointment, setAppointment] = useState(null);
  useEffect(() => setAppointment(null), [request.id]);
  return (
    <div className="cw-detail">
      <button
        type="button"
        className="cw-back"
        disabled={busy}
        onClick={onBack}
      >
        <Icon name="back" />
        Back to requests
      </button>
      <div className="cw-detail-title">
        <div>
          <p className="cw-kicker">APPOINTMENT REQUEST</p>
          <h2>{request.clinic_name}</h2>
          <p className="cw-subtle">
            {request.id} · Received {received(request.created)}
          </p>
        </div>
        <Badge status={request.status} />
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
            <span>Price information</span>
            <p>
              {request.price_text ||
                "Confirm the exact total with the patient."}
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
                      <a
                        href={`tel:${String(request.phone).replace(/[^+0-9]/g, "")}`}
                      >
                        <Icon name="phone" />
                        {request.phone}
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
      {!request.contact_hidden && (
        <section className="cw-decision">
          <div>
            <h3>Update this request</h3>
            <p>
              Review the preferred times and contact the patient to confirm the
              appointment.
            </p>
          </div>
          <div className="cw-decision-actions">
            <button
              type="button"
              className="cw-primary"
              disabled={busy || !approvalReady(appointment)}
              onClick={() => onAction(request.id, "scheduled", appointment)}
            >
              <Icon name="check" />
              Approve request
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction(request.id, "voicemail")}
            >
              Contact attempted
            </button>
            <button
              type="button"
              className="cw-decline"
              disabled={busy}
              onClick={() => onAction(request.id, "unable")}
            >
              Decline request
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
export default function CenterWorkspace({ onLogin }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState("");
  const [tab, setTab] = useState("overview"),
    [request, setRequest] = useState(null),
    [query, setQuery] = useState(""),
    [center, setCenter] = useState("all"),
    [sort, setSort] = useState("newest"),
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
  async function open(id, status, appointment) {
    const seq = ++sequence.current;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const detail = await call("request", {
        id,
        ...(status ? { status } : {}),
        ...(status === "scheduled" ? { appointment } : {}),
      });
      if (seq !== sequence.current) return;
      setRequest(detail);
      if (status) {
        setMessage(
          status === "scheduled"
            ? "Request approved. The updated status is available in the patient dashboard."
            : status === "unable"
              ? "Request declined. The request status has been updated."
              : "Contact attempt recorded.",
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
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await call("logout", {});
      setData(null);
      setRequest(null);
      location.hash = "home";
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const all = data?.requests || [],
    centers = data?.centers || [],
    openCount = all.filter(isOpen).length,
    approved = all.filter((item) => item.status === "scheduled").length;
  const rows = all
    .filter(
      (item) =>
        (tab === "open"
          ? isOpen(item)
          : tab === "approved"
            ? item.status === "scheduled"
            : true) &&
        (!query.trim() ||
          `${item.id} ${item.clinic_name}`
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
  const nav = [
    ["overview", "Overview", "overview", null],
    ["all", "Requests", "requests", all.length],
    ["profile", "Center profiles", "building", centers.length],
  ];
  const name = centers.length === 1 ? centers[0].name : "Center workspace",
    initials = (name || "Center")
      .split(/\s+/)
      .map((x) => x[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  return (
    <section
      className="center-workspace"
      aria-busy={busy}
      onSubmit={(e) => e.stopPropagation()}
    >
      {data && (
        <aside className="cw-sidebar">
          <div className="cw-account">
            <span className="cw-avatar">{initials}</span>
            <div>
              <strong>{name}</strong>
              <span>
                <i />
                Verified center account
              </span>
            </div>
          </div>
          <p className="cw-nav-caption">WORKSPACE</p>
          <nav className="cw-navigation" aria-label="Center dashboard sections">
            {nav.map(([key, label, icon, count]) => (
              <button
                type="button"
                key={key}
                aria-label={label}
                disabled={busy}
                aria-current={
                  tab === key ||
                  (key === "all" && ["open", "approved"].includes(tab))
                    ? "page"
                    : undefined
                }
                onClick={() => select(key)}
              >
                <Icon name={icon} />
                <span>{label}</span>
                {count !== null && <small>{count}</small>}
              </button>
            ))}
            <button
              type="button"
              className="cw-mobile-logout"
              aria-label="Sign out of center"
              disabled={busy}
              onClick={logout}
            >
              <Icon name="exit" />
              <span>Sign out</span>
            </button>
          </nav>
          <div className="cw-sidebar-bottom">
            <a href="/contact">
              <Icon name="help" />
              Help &amp; support
            </a>
            <button type="button" disabled={busy} onClick={logout}>
              <Icon name="exit" />
              Sign out of center
            </button>
            <p>{data.email}</p>
          </div>
        </aside>
      )}
      <div className={`cw-content${!data ? " cw-content-solo" : ""}`}>
        <header className="cw-page-heading">
          <div>
            <p className="cw-kicker">MYSELFPAY / CENTER PORTAL</p>
            <h1>{request ? "Request details" : titles[tab]}</h1>
            <p className="cw-subtitle">
              {request
                ? "Review the request and coordinate the next step."
                : tab === "profile"
                  ? "Keep your center information close at hand."
                  : "Your appointment requests and center information, in one workspace."}
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
            />
          </div>
        ) : tab === "profile" ? (
          <Profile centers={centers} email={data.email} />
        ) : (
          <>
            <div className="cw-metrics" aria-label="Request totals">
              {[
                [
                  "all",
                  "Total requests",
                  all.length,
                  "requests",
                  "All submitted requests",
                ],
                [
                  "open",
                  "Awaiting response",
                  openCount,
                  "inbox",
                  "Requests to review",
                ],
                [
                  "approved",
                  "Approved",
                  approved,
                  "check",
                  "Accepted by your center",
                ],
              ].map(([key, label, count, icon, note]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => select(key)}
                  className={key === "open" ? "cw-metric-priority" : ""}
                >
                  <span className="cw-metric-top">
                    {label}
                    <Icon name={icon} />
                  </span>
                  <strong>{count}</strong>
                  <span className="cw-metric-note">
                    {note}
                    <Icon name="arrow" width="16" height="16" />
                  </span>
                </button>
              ))}
            </div>
            {tab === "overview" && openCount > 0 && (
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
                  <p>Review preferred times and respond to your patients.</p>
                </div>
                <button type="button" onClick={() => select("open")}>
                  Review requests <Icon name="arrow" />
                </button>
              </div>
            )}
            <section className="cw-request-panel">
              <div className="cw-section-title">
                <div>
                  <h2>
                    {tab === "overview" ? "Recent requests" : titles[tab]}
                  </h2>
                  <p>
                    {rows.length} {rows.length === 1 ? "request" : "requests"}
                    {query || center !== "all" ? " matching your filters" : ""}
                  </p>
                </div>
                {tab === "overview" && (
                  <button
                    className="cw-text-button"
                    type="button"
                    onClick={() => select("all")}
                  >
                    View all requests <Icon name="arrow" />
                  </button>
                )}
              </div>
              <RequestStatusTabs
                value={tab}
                counts={{ all: all.length, open: openCount, approved }}
                onChange={select}
                disabled={busy}
              />
              <div className="cw-toolbar">
                <label className="cw-search">
                  <Icon name="search" />
                  <input
                    type="search"
                    aria-label="Search requests"
                    placeholder="Search reference or center name"
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
                      : tab === "open"
                        ? "You’re all caught up"
                        : "No requests yet"
                  }
                  description={
                    query || center !== "all"
                      ? "Try a different reference or center name."
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
                      <span role="columnheader">Reference / Center</span>
                      <span role="columnheader">Appointment times</span>
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
                            <span>{item.id}</span>
                            <h3>{item.clinic_name}</h3>
                          </div>
                          <div role="cell" className="cw-preferences">
                            <Icon name="calendar" />
                            <div>
                              {item.status === "scheduled" ? (
                                <><strong>Approved appointment</strong><span>{approvedSlotLabel(item.approved_slot)}</span></>
                              ) : item.slots?.length ? (
                                <>
                                  <strong>
                                    {formatDate(item.slots[0].date)}
                                  </strong>
                                  <span>
                                    {item.slots[0].period === "morning"
                                      ? "Morning"
                                      : "Afternoon"}
                                    {item.slots.length > 1
                                      ? ` + ${item.slots.length - 1} more`
                                      : ""}
                                  </span>
                                </>
                              ) : (
                                <span>Not provided</span>
                              )}
                            </div>
                          </div>
                          <div role="cell" className="cw-received">
                            <span className="cw-mobile-label">Received</span>
                            {received(item.created)}
                          </div>
                          <div role="cell">
                            <Badge status={item.status} />
                          </div>
                          <div role="cell" className="cw-row-action">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => open(item.id)}
                            >
                              Open request <span aria-hidden="true">→</span>
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
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
