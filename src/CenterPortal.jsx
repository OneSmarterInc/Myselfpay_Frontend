import { useEffect, useState } from "react";
import { OTPInput } from "./BookingControls.jsx";
import "./center-portal.css";

const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
let csrf = "";
async function call(action, data) {
  const response = await fetch(`${base}/center/${action}`, {
    method: data === undefined ? "GET" : "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", "X-Center-CSRF": csrf },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(45000),
  });
  let value;
  try {
    value = await response.json();
  } catch {
    throw new Error("The center service is unavailable. Please try again.");
  }
  if (!response.ok) {
    const error = new Error(value.error || "Unable to complete this request.");
    error.status = response.status;
    throw error;
  }
  if (value.center_csrf) csrf = value.center_csrf;
  return value;
}
export function CenterLogin({ onDone }) {
  const [email, setEmail] = useState(""),
    [challenge, setChallenge] = useState("");
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);
    setError("");
    try {
      if (challenge) {
        await call("verify", { verification_id: challenge, code });
        // Confirm the browser accepted its HttpOnly center cookie.
        await call("dashboard");
        onDone();
      } else {
        const value = await call("code", { email });
        setChallenge(value.verification_id);
        setCode("");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="center-login">
      <p className="eyebrow">FOR IMAGING CENTERS</p>
      <h2 id="dialogTitle">Center login</h2>
      <p>
        Access your center information and appointment requests using the email
        listed in our directory.
      </p>
      <form onSubmit={submit}>
        <label htmlFor="centerEmail">Center email</label>
        <input
          id="centerEmail"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          readOnly={!!challenge}
          disabled={busy}
          onChange={(e) => setEmail(e.target.value)}
        />
        {challenge && (
          <>
            <p role="status">
              A six-digit code was sent to {email}. Check your inbox or spam
              folder.
            </p>
            <OTPInput
              id="centerOTP"
              label="Center login code"
              value={code}
              onChange={setCode}
              disabled={busy}
            />
          </>
        )}
        {error && (
          <p className="center-error" role="alert">
            {error}{" "}
            {/not listed|no longer listed/.test(error) && (
              <a href="/contact">Contact support</a>
            )}
          </p>
        )}
        <button
          className="primary"
          disabled={busy || (!!challenge && !/^\d{6}$/.test(code))}
        >
          {busy
            ? "Please wait…"
            : challenge
              ? "Verify and open dashboard"
              : "Send email code"}
        </button>
      </form>
      {challenge && (
        <div className="actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setChallenge("");
              setCode("");
              setError("");
            }}
          >
            Change email / request a new code
          </button>
        </div>
      )}
    </section>
  );
}
const labels = {
  requested: "Open request",
  voicemail: "Contact attempted",
  scheduled: "Approved",
  unable: "Declined",
  expired: "Expired",
};
function Slots({ request }) {
  return (
    <ul className="center-slots">
      {request.slots.map((slot, index) => (
        <li key={index}>
          {new Date(`${slot.date}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}{" "}
          ·{" "}
          {slot.period === "morning"
            ? "Morning (8 am–12 pm)"
            : "Afternoon (12–5 pm)"}
        </li>
      ))}
      <li className="muted">{request.timezone}</li>
    </ul>
  );
}
export default function CenterPortal({ onLogin }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [request, setRequest] = useState(null),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(0);
  async function refresh() {
    setError("");
    setBusy(true);
    try {
      setData(await call("dashboard"));
    } catch (e) {
      setError(e.message);
      if (e.status === 401) setData(null);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function open(id, status) {
    setError("");
    setBusy(true);
    try {
      setRequest(await call("request", { id, ...(status ? { status } : {}) }));
      if (status) setData(await call("dashboard"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const all = data?.requests || [],
    openCount = all.filter((item) =>
      ["requested", "voicemail"].includes(item.status),
    ).length;
  const rows = all.filter(
    (item) =>
      filter === "all" ||
      (filter === "open"
        ? ["requested", "voicemail"].includes(item.status)
        : item.status === "scheduled"),
  );
  return (
    <section className="center-portal" onSubmit={(e) => e.stopPropagation()}>
      <div className="center-heading">
        <div>
          <p className="eyebrow">MYSELFPAY CENTER PORTAL</p>
          <h1>Center dashboard</h1>
          <p className="muted">
            {data?.email || "Manage your center’s appointment requests."}
          </p>
        </div>
        {data && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await call("logout", {});
                csrf = "";
                location.hash = "home";
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Sign out of center
          </button>
        )}
      </div>
      {error && (
        <p className="center-error" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <section className="center-empty">
          <p role="status">
            {busy
              ? "Loading your center dashboard…"
              : "Log in with your center email to continue."}
          </p>
          {!busy && (
            <button type="button" className="primary" onClick={onLogin}>
              Center login
            </button>
          )}
        </section>
      ) : (
        <>
          <div className="center-layout">
            <aside className="center-profile">
              <h2>Your centers</h2>
              {data.centers.map((center) => (
                <section key={center.id}>
                  <h3>{center.name}</h3>
                  <p>{center.address || center.coverage || center.area}</p>
                  <dl>
                    <dt>Email</dt>
                    <dd>{center.email}</dd>
                    {center.phone && (
                      <>
                        <dt>Phone</dt>
                        <dd>{center.phone}</dd>
                      </>
                    )}
                    {center.source && (
                      <>
                        <dt>Website</dt>
                        <dd>{center.source}</dd>
                      </>
                    )}
                    {[
                      ["mri", "MRI"],
                      ["ct", "CT"],
                      ["other", "Other services"],
                    ].map(([key, label]) =>
                      center[key] ? (
                        <div key={key}>
                          <dt>{label}</dt>
                          <dd>{center[key]}</dd>
                        </div>
                      ) : null,
                    )}
                  </dl>
                  {center.is_test_center && (
                    <small>Test center · no medical care</small>
                  )}
                </section>
              ))}
            </aside>
            <div className="center-requests">
              <div className="center-summary">
                <strong>{all.length} total requests</strong>
                <span>{openCount} open</span>
                <span>
                  {all.filter((item) => item.status === "scheduled").length}{" "}
                  approved
                </span>
              </div>
              <div className="center-toolbar">
                <div role="group" aria-label="Filter requests">
                  {[
                    ["all", "All"],
                    ["open", "Open"],
                    ["approved", "Approved"],
                  ].map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      aria-pressed={filter === key}
                      onClick={() => {
                        setFilter(key);
                        setPage(0);
                        setRequest(null);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button type="button" disabled={busy} onClick={refresh}>
                  Refresh
                </button>
              </div>
              {request ? (
                <section className="center-request-detail">
                  <button type="button" onClick={() => setRequest(null)}>
                    ← Back to requests
                  </button>
                  <h2>{request.clinic_name}</h2>
                  <p className="center-status">
                    {labels[request.status] || request.status}
                  </p>
                  <p className="muted">{request.id}</p>
                  <h3>Preferred times</h3>
                  <Slots request={request} />
                  <dl>
                    <dt>Price</dt>
                    <dd>{request.price_text}</dd>
                    {request.first_name && (
                      <>
                        <dt>Patient</dt>
                        <dd>{request.first_name}</dd>
                        <dt>Email</dt>
                        <dd>
                          <a href={`mailto:${request.patient_email}`}>
                            {request.patient_email}
                          </a>
                        </dd>
                        <dt>Mobile</dt>
                        <dd>
                          <a href={`tel:${request.phone}`}>{request.phone}</a>
                        </dd>
                      </>
                    )}
                  </dl>
                  {request.secure_chat_url && (
                    <a className="flow-outline" href={request.secure_chat_url} target="_blank" rel="noopener noreferrer">Open secure chat</a>
                  )}
                  {request.contact_hidden ? (
                    <p>Request closed. Patient contact details are hidden.</p>
                  ) : (
                    <div className="actions">
                      <button
                        type="button"
                        className="primary"
                        disabled={busy}
                        onClick={() => open(request.id, "scheduled")}
                      >
                        Approve request
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => open(request.id, "voicemail")}
                      >
                        Contact attempted
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => open(request.id, "unable")}
                      >
                        Decline request
                      </button>
                    </div>
                  )}
                </section>
              ) : (
                <>
                  {!rows.length && (
                    <p className="center-empty">
                      No {filter === "all" ? "" : filter + " "}requests yet.
                    </p>
                  )}
                  {rows.slice(page * 10, page * 10 + 10).map((item) => (
                    <article className="center-request-row" key={item.id}>
                      <div>
                        <p className="center-status">
                          {labels[item.status] || item.status}
                        </p>
                        <h2>{item.clinic_name}</h2>
                        <Slots request={item} />
                        <small className="muted">{item.id}</small>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => open(item.id)}
                      >
                        Open request →
                      </button>
                    </article>
                  ))}
                  {rows.length > 10 && (
                    <div className="center-pagination">
                      <button
                        disabled={page === 0}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </button>
                      <span>
                        Page {page + 1} of {Math.ceil(rows.length / 10)}
                      </span>
                      <button
                        disabled={(page + 1) * 10 >= rows.length}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
