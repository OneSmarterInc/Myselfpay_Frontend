import Icon from "./Icon.jsx";
import { activityLabel } from "./activity.js";
import { useEffect, useState } from "react";
import { api } from "./api.js";
import { useResource } from "./useResource.js";
import { Alert, Pagination, money, dateTime } from "./components.jsx";

export function LoadState({ resource, retry }) {
  return resource.loading ? (
    <p role="status">Loading…</p>
  ) : resource.error ? (
    <Alert error>
      {resource.error}
      {retry && <button onClick={retry}>Try again</button>}
    </Alert>
  ) : null;
}
export function DataTable({ headers, rows }) {
  return (
    <table>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} data-label={headers[j]}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SignIn({ session, onSession, devLogin, busy, navigate }) {
  const [email,setEmail]=useState(''),[code,setCode]=useState(''),[sent,setSent]=useState(null),[error,setError]=useState(''),[sending,setSending]=useState(false),[verifying,setVerifying]=useState(false);
  useEffect(()=>{sessionStorage.setItem('center-pro-mode','center')},[]);
  async function submit(e){
    e.preventDefault();setSending(true);setError('');
    try{setSent(await api('/auth/otp/request',{method:'POST',body:{email}}));setCode('');}
    catch(e){setError(e.message)}finally{setSending(false)}
  }
  async function verify(e){
    e.preventDefault();setVerifying(true);setError('');
    try{const next=await api('/auth/otp/verify',{method:'POST',body:{challenge:sent.challenge,code}});onSession(next);navigate('overview');}
    catch(e){setError(e.message)}finally{setVerifying(false)}
  }
  return <section className="panel auth">
    <h1>{sent?'Enter your sign-in code':'Center sign in'}</h1>
    {error&&<Alert error>{error}</Alert>}
    {sent?<>
      <p>{sent.detail}</p>
      <p className="muted">Email: {email}</p>
      {sent.development_code&&<p>Local development code: <strong>{sent.development_code}</strong></p>}
      <form onSubmit={verify}>
        <label className="field">Six-digit code<input key={sent.challenge} autoFocus type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/[^0-9]/g,''))}/></label>
        <div className="actions"><button type="submit" className="primary" disabled={verifying||sending||code.length!==6}>{verifying?'Signing in...':'Verify and sign in'}</button></div>
      </form>
      <div className="actions"><button type="button" disabled={sending||verifying} onClick={submit}>{sending?'Sending...':'Resend code'}</button><button type="button" disabled={sending||verifying} onClick={()=>{setSent(null);setCode('');setError('')}}>Use another email</button></div>
    </>:<>
      <p>Enter your center owner or staff email. We will email you a six-digit code to sign in.</p>
      <form onSubmit={submit}>
        <label className="field">Work email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <div className="actions sign-in-actions"><button type="submit" className="primary" disabled={sending}>{sending?'Sending...':'Email me a code'}</button></div>
      </form>
    </>}
    {session?.development_login&&<details className="developer-access"><summary>Local sample accounts</summary><p>No email is sent for sample accounts.</p><div className="actions">{['staff','owner','admin'].map(role=><button key={role} disabled={busy} onClick={()=>devLogin(role)}>Sample {role}</button>)}</div></details>}
  </section>;
}

export function VerifyLink({ token, onSession, navigate }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function verify() {
    setBusy(true);
    try {
      const session = await api("/auth/verify", {
        method: "POST",
        body: { token },
      });
      onSession(session);
      history.replaceState(null, "", "#center-pro/overview");
      navigate("overview");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel auth">
      <h1>Complete your sign-in</h1>
      <p>
        Confirm your sign-in to continue.
      </p>
      {error && <Alert error>{error}</Alert>}
      <div className="actions">
        <button className="primary" disabled={busy || !!error} onClick={verify}>
          {busy ? "Verifying…" : "Continue securely"}
        </button>
        <button onClick={() => navigate("overview")}>Request a new link</button>
      </div>
    </section>
  );
}

export function AdminLogin({ navigate }) {
 return <section className="panel auth"><h1>Administrator sign in</h1><p>Use your existing MySelfPay administrator account and authenticator.</p><a className="button-link primary" href="/admin/login/?next=/admin/center-pro/">Continue to admin login</a></section>;
}

export function AdminPages({ route, navigate }) {
  const [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const center = route.startsWith("admin-access/") ? route.split("/")[1] : null;
  const audit = route === "admin-audit";
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const path = center
    ? `/admin/centers/${center}/assignments`
    : `/admin/${audit ? "audit" : "centers"}`;
  const resource = useResource(
    path + `?page=${page}&search=${encodeURIComponent(query)}`,
    refresh,
  );
  const [values, setValues] = useState({ email: "", name: "", role: "staff" }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [revoking, setRevoking] = useState(null);
  async function assign(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api(path, { method: "POST", body: values });
      setMessage(result.detail);
      setValues({ email: "", name: "", role: "staff" });
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/centers/${center}/assignments/${revoking.id}/revoke`, {
        method: "POST",
        body: {},
      });
      setMessage("Access revoked.");
      setRevoking(null);
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {center && (
        <button
          className="text-button"
          onClick={() => navigate("admin-centers")}
        >
          <Icon name="back" /> Back to centers
        </button>
      )}
      <div className="page-heading">
        <h1>
          {center
            ? "Owner and staff assignments"
            : audit
              ? "Organization audit"
              : "Centers and access"}
        </h1>
        <p>
          {center
            ? "Manage access to this center."
            : "Super-admin workspace"}
        </p>
      </div>
      {message && <Alert>{message}</Alert>}
      {error && <Alert error>{error}</Alert>}
      <LoadState resource={resource} />
      {resource.data && (
        <section className={"panel data-panel " + (audit ? "admin-audit-table" : "admin-access-table")}>
          <div className={(!center && !audit) ? "admin-search-toolbar" : undefined}>
      {!center && !audit && (
        <label className="field search-field">
          Search centers
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      )}
          </div>
          {!resource.data.count ? (
            <div className="table-state">No records found.</div>
          ) : (
            <DataTable
              headers={
                center
                  ? ["Person", "Role", "Action"]
                  : audit
                    ? ["When (UTC)", "Center / actor", "Activity"]
                    : ["Center", "Owners / staff", "Action"]
              }
              rows={resource.data.results.map((row) =>
                center
                  ? [
                      <>
                        <strong>{row.name}</strong>
                        <span className="cell-note">{row.email}</span>
                      </>,
                      <span className="badge neutral">{row.role === "owner" ? "Owner" : "Staff"}</span>,
                      <button onClick={() => setRevoking(row)}>
                        Revoke access
                      </button>,
                    ]
                  : audit
                    ? [
                        dateTime(row.created_at, "UTC"),
                        <>
                          {row.center}
                          <span className="cell-note">{row.actor}</span>
                        </>,
                        <>
                          {activityLabel(row.action)}
                          <span className="cell-note">{row.reference}</span>
                        </>,
                      ]
                    : [
                        row.name,
                        `${row.owners} owners · ${row.staff} staff`,
                        <button
                          onClick={() => navigate(`admin-access/${row.id}`)}
                        >
                          Manage access
                        </button>,
                      ],
              )}
            />
          )}
          <Pagination
            count={resource.data.count}
            page={page}
            size={5}
            onPage={setPage}
          />
        </section>
      )}
      {center && (
        <details className="panel spaced-panel compact-disclosure">
          <summary>Assign a person</summary>
          <form className="assignment-form" onSubmit={assign}>
            <div className="form-grid">
              <label className="field">
                Name
                <input
                  required
                  maxLength={120}
                  value={values.name}
                  onChange={(e) =>
                    setValues({ ...values, name: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Work email
                <input
                  type="email"
                  required
                  value={values.email}
                  onChange={(e) =>
                    setValues({ ...values, email: e.target.value })
                  }
                />
              </label>
            </div>
            <label className="field">
              Role
              <select
                value={values.role}
                onChange={(e) => setValues({ ...values, role: e.target.value })}
              >
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            </label>
            <button className="primary" disabled={busy}>
              Assign access
            </button>
          </form>
        </details>
      )}
      {revoking && (
        <section className="panel spaced-panel">
          <h2>Revoke {revoking.name}'s access?</h2>
          <p>
            This removes access to this center. Other center assignments are
            unchanged.
          </p>
          <div className="actions">
            <button disabled={busy} onClick={revoke}>
              Confirm revocation
            </button>
            <button disabled={busy} onClick={() => setRevoking(null)}>
              Cancel
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export function Scheduling({ center, route, navigate }) {
  if (center.role !== "staff")
    return <Alert error>Staff access is required.</Alert>;
  return route === "working-hours" ? (
    <Hours center={center} />
  ) : (
    <Availability center={center} navigate={navigate} />
  );
}
function Hours({ center }) {
  const resource = useResource(`/centers/${center.id}/hours`),
    [rows, setRows] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (resource.data) setRows(resource.data);
  }, [resource.data]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api(`/centers/${center.id}/hours`, {
        method: "POST",
        body: rows,
      });
      setMessage(result.detail);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  return (
    <>
      <div className="page-heading hours-heading">
        <div><h1>Working hours</h1>
        <p>
          Times are in {center.timezone}. Changes do not move existing
          appointments.
        </p></div>
        {rows && <button className="primary" type="submit" form="working-hours-form" disabled={busy}>
          <Icon name="save" /> {busy ? "Saving..." : "Save working hours"}
        </button>}
      </div>
      <LoadState resource={resource} />
      {message && <Alert>{message}</Alert>}
      {error && <Alert error>{error}</Alert>}
      {rows && (
        <form id="working-hours-form" className="panel hours-panel" onSubmit={save}>
          <div className="hours-columns" aria-hidden="true"><span>Day</span><span>Status</span><span>Opens</span><span>Closes</span></div>
          <div className="hours-list">
            {rows.map((row, i) => (
              <div className="hours-row" key={row.weekday}>
                <strong>{days[row.weekday]}</strong>
                <label className="check-label">
                  <input
                    aria-label={`${days[row.weekday]} closed`}
                    type="checkbox"
                    checked={row.closed}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, j) =>
                          j === i ? { ...r, closed: e.target.checked } : r,
                        ),
                      )
                    }
                  />
                  Closed
                </label>
                <label>
                  <span className="hours-time-label">Opens</span>
                  <input
                    type="time"
                    required
                    disabled={row.closed}
                    aria-label={`${days[row.weekday]} opening time`}
                    value={row.opens.slice(0, 5)}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, j) =>
                          j === i ? { ...r, opens: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  <span className="hours-time-label">Closes</span>
                  <input
                    type="time"
                    required
                    disabled={row.closed}
                    aria-label={`${days[row.weekday]} closing time`}
                    value={row.closes.slice(0, 5)}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, j) =>
                          j === i ? { ...r, closes: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        </form>
      )}
    </>
  );
}
function Availability({ center, navigate }) {
  const [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [values, setValues] = useState({
      starts_at: "",
      ends_at: "",
      resource: "",
    });
  const resource = useResource(
    `/centers/${center.id}/availability?page=${page}`,
    refresh,
  );
  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/centers/${center.id}/availability`, {
        method: "POST",
        body: values,
      });
      setMessage("Available slot added.");
      setRefresh((n) => n + 1);
      setValues({ ...values, starts_at: "", ends_at: "" });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function block(row) {
    setBusy(true);
    setError("");
    try {
      await api(`/centers/${center.id}/availability/${row.id}/block`, {
        method: "POST",
        body: { blocked: !row.blocked },
      });
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading availability-heading">
        <div><h1>Availability</h1>
        <p>
          Times in {center.timezone}.
        </p></div>
      </div>
      {error && <Alert error>{error}</Alert>}
      {message && <Alert>{message}</Alert>}
      <LoadState resource={resource} />
      {resource.data && (
        <section className="panel data-panel availability-table" aria-label="Center availability">
          {resource.data.count ? (
            <DataTable
              headers={["Time", "Resource", "Status", "Action"]}
              rows={resource.data.results.map((row) => [
                <>
                  <strong className="slot-date">{new Intl.DateTimeFormat("en-US", {timeZone: center.timezone, dateStyle: "medium"}).format(new Date(row.starts_at))}</strong>
                  <span className="cell-note slot-range">
                    {new Intl.DateTimeFormat("en-US", {timeZone: center.timezone, hour: "numeric", minute: "2-digit"}).formatRange(new Date(row.starts_at), new Date(row.ends_at))}
                  </span>
                </>,
                row.resource,
                <span className={"badge " + (row.confirmed ? "slot-confirmed" : row.blocked ? "slot-blocked" : "success")}>
                  {row.confirmed ? "Confirmed" : row.blocked ? "Blocked" : "Available"}
                </span>,
                row.confirmed ? <span className="cell-note">Booked appointment</span> : <button
                  disabled={busy}
                  onClick={() => block(row)}
                >
                  {row.blocked ? "Unblock" : "Block time"}
                </button>,
              ])}
            />
          ) : (
            <div className="table-state">
              No future slots. Add a slot below.
            </div>
          )}
          <Pagination
            count={resource.data.count}
            page={page}
            size={5}
            onPage={setPage}
          />
        </section>
      )}
      <details className="panel spaced-panel compact-disclosure">
        <summary>Add an available slot</summary>
        <form onSubmit={add}>
        <div className="form-grid">
          <label className="field">
            Starts at
            <input
              type="datetime-local"
              required
              value={values.starts_at}
              onChange={(e) =>
                setValues({ ...values, starts_at: e.target.value })
              }
            />
          </label>
          <label className="field">
            Ends at
            <input
              type="datetime-local"
              required
              value={values.ends_at}
              onChange={(e) =>
                setValues({ ...values, ends_at: e.target.value })
              }
            />
          </label>
        </div>
        <label className="field">
          Resource name
          <input
            required
            maxLength={80}
            placeholder="Scanner or room name"
            value={values.resource}
            onChange={(e) => setValues({ ...values, resource: e.target.value })}
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Add slot"}
        </button>
        </form>
      </details>
    </>
  );
}

export function Rescue({ center }) {
  const resource = useResource(
      center.role === "staff" ? `/centers/${center.id}/rescue/offers` : null,
    ),
    [offer, setOffer] = useState(""),
    [consent, setConsent] = useState(false),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setResult(
        await api(`/centers/${center.id}/rescue`, {
          method: "POST",
          body: { offer_id: Number(offer), consent },
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (center.role !== "staff")
    return <Alert error>Staff access is required.</Alert>;
  return (
    <>
      <LoadState resource={resource} />
      {error && <Alert error>{error}</Alert>}
      <section className="panel rescue-panel">
        <h2>Create a self-pay link</h2>

        <form className="rescue-form" onSubmit={create}>
          <label className="field">
            Exam offer
            <select
              required
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
            >
              <option value="">Select an offer</option>
              {resource.data?.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.exam} · {money(row.price)}
                </option>
              ))}
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Patient consent to receive this self-pay link has been recorded.
          </label>
          <div className="actions">
            <button className="primary" disabled={busy}>
              <Icon name="link" /> {busy ? "Creating…" : "Create secure link"}
            </button>
          </div>
        </form>
        {result && (
          <div className="spaced-panel">
            <Alert>{result.detail}</Alert>
            <a
              className="long-link"
              href={result.url}
              target="_blank"
              rel="noreferrer"
            >
              Open patient link
            </a>
            <label className="field">
              Link to share
              <input
                readOnly
                value={result.url}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <p className="muted">
              Expires {dateTime(result.expires_at, center.timezone)}. Do not
              share this link publicly.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

export function PatientPage({ route }) {
  const referral = route.startsWith("referral/"),
    token = route.split("/")[1];
  const path = referral ? `/referral/${token}` : `/patient/${token}`;
  const [refresh, setRefresh] = useState(0),
    [step, setStep] = useState(0),
    [name, setName] = useState(""),
    [offer, setOffer] = useState(""),
    [windows, setWindows] = useState([{date:"",period:""},{date:"",period:""},{date:"",period:""}]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState(null);
  const resource = useResource(path, refresh);
  async function submit(e) {
    e.preventDefault();
    const hoursError = windows.map(value => patientPeriodError(value, resource.data?.working_hours)).find(Boolean);
    if (hoursError) { setError(hoursError); return; }
    if (new Set(windows.map(w => `${w.date}/${w.period}`)).size !== 3) { setError("Choose three different date and period combinations."); return; }
    setBusy(true);
    setError("");
    try {
      setResult(
        await api(path, {
          method: "POST",
          body: {
            patient_name: name,
            preferences: windows,
            ...(referral ? { offer_id: Number(offer) } : {}),
          },
        }),
      );
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const data = resource.data,
    selected = referral
      ? data?.offers.find((o) => String(o.id) === offer)
      : data;
  return (
    <section className="panel patient-panel">
      <LoadState resource={resource} />
      {error && <Alert error>{error}</Alert>}
      {data && (
        <>
          <h1>
            {data.status === "confirmed"
              ? "Appointment confirmed"
              : result || data.status === "pending"
                ? "Request received"
                : "Request your scan"}
          </h1>
          <p>{data.center}</p>
          {data.status === "confirmed" ? (
            <>
              <p>
                Your appointment is {dateTime(data.appointment, data.timezone)}.
              </p>
              <p>Payment is arranged directly with your center.</p>
            </>
          ) : result || data.status === "pending" ? (
            <>
              <Alert>
                {result?.detail ||
                  "Your request is with the center. Staff must confirm the exact time."}
              </Alert>
              <p>Reference: {result?.reference || data.reference}</p>
              {result?.status_url && (
                <p>
                  <a href={result.status_url}>Track this request securely</a>
                </p>
              )}
              <button onClick={() => {
                if (referral && result?.status_url) {
                  const target = new URL(result.status_url, window.location.href);
                  window.location.hash = target.hash;
                } else setRefresh((n) => n + 1);
              }}>
                Check appointment status
              </button>
            </>
          ) : (
            <>
              {referral && (
                <label className="field">
                  Exam
                  <select
                    required
                    value={offer}
                    onChange={(e) => {
                      setOffer(e.target.value);
                      setStep(0);
                    }}
                  >
                    <option value="">Select an exam</option>
                    {data.offers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.exam} · {money(o.price)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {selected && (
                <>
                  <dl>
                    <dt>Exam</dt>
                    <dd>{selected.exam}</dd>
                    <dt>Expected self-pay price</dt>
                    <dd>{money(selected.price)}</dd>
                  </dl>
                  <Alert>
                    This price summary is not an issued Good Faith Estimate. The
                    center must provide its approved estimate before care. No
                    payment is taken here.
                  </Alert>
                  {step === 0 ? (
                    <button className="primary" onClick={() => setStep(1)}>
                      Continue to request a time
                    </button>
                  ) : (
                    <form onSubmit={submit}>
                      <label className="field">
                        Your name
                        <input
                          required
                          maxLength={120}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </label>
                      <p>
                        Choose three date and period preferences.
                        These are preferences, not confirmed slots.
                      </p>
                      <p className="muted">Morning: 8 AM–12 PM. Afternoon: 12–5 PM. Times in {data.timezone}.</p>
                      {windows.map((value, i) => (
                        <div className="field" key={i}>
                          <strong>{`Preference ${i + 1}`}</strong>
                          <span className="preference-fields">
                            <input type="date" aria-label={`Preference ${i + 1} date`} required value={value.date}
                              onChange={e => setWindows(windows.map((w,j) => j===i ? {date:e.target.value,period:""} : w))} />
                            <select aria-label={`Preference ${i + 1} period`} required value={value.period}
                              onChange={e => setWindows(windows.map((w,j) => j===i ? {...w,period:e.target.value} : w))}>
                              <option value="">Select a period</option>
                              <option value="morning" disabled={!!patientPeriodError({date:value.date,period:"morning"},data.working_hours)}>Morning (8 AM–12 PM)</option>
                              <option value="afternoon" disabled={!!patientPeriodError({date:value.date,period:"afternoon"},data.working_hours)}>Afternoon (12–5 PM)</option>
                            </select>
                          </span>
                          {value.date && <span className="patient-hours-hint">{patientHoursHint(value.date, data.working_hours)}</span>}
                        </div>
                      ))}
                      <button className="primary" disabled={busy}>
                        {busy ? "Submitting…" : "Send request to center"}
                      </button>
                    </form>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

export function Estimates({ center, bookingId, navigate }) {
  const [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const path = `/centers/${center.id}/requests/${bookingId}/estimates`;
  const resource = useResource(
    center.role === "staff" ? path + `?page=${page}&page_size=1` : null,
    refresh,
  );
  async function create() {
    setBusy(true);
    setError("");
    try {
      await api(path, { method: "POST", body: {} });
      setPage(1);
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (center.role !== "staff")
    return <Alert error>Staff access is required.</Alert>;
  return (
    <div className="estimate-workspace">
      <button
        className="text-button"
        onClick={() => navigate(`request/${bookingId}`)}
      >
        <Icon name="back" /> Back to request
      </button>
      <div className="page-heading">
        <h1>Estimate drafts</h1>
        <p>
          Drafts only. Not issued Good Faith Estimates.
        </p>
      </div>
      {error && <Alert error>{error}</Alert>}
      <div className="actions no-print">
        <button className="primary" disabled={busy} onClick={create}>
          {busy ? "Creating…" : "Create draft version"}
        </button>
        <button onClick={() => window.print()}><Icon name="print" /> Print this draft</button>
      </div>
      <LoadState resource={resource} />
      {resource.data && !resource.data.count && (
        <Alert>No draft versions yet.</Alert>
      )}
      {resource.data?.results.map((row) => (
        <article className="panel spaced-panel estimate-paper" key={row.id}>
          <h2>{row.snapshot.status}</h2>
          <p>
            Version {row.version} · {dateTime(row.created_at, center.timezone)}
          </p>
          <dl>
            {[
              ["Patient", row.snapshot.patient],
              ["Center", row.snapshot.center],
              ["Reference", row.snapshot.reference],
              ["Exam", row.snapshot.exam],
              ["Expected charge", money(row.snapshot.price)],
            ].map(([k, v]) => (
              <div className="dl-pair" key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p>{row.snapshot.notice}</p>
        </article>
      ))}
      {resource.data && (
        <Pagination
          count={resource.data.count}
          page={page}
          size={1}
          onPage={setPage}
        />
      )}
    </div>
  );
}

export function OwnerExtras({ center, route }) {
  const [refresh, setRefresh] = useState(0);
  const resource = useResource(
    center.role === "owner" ? `/centers/${center.id}/${route}` : null,
    refresh,
  );
  if (center.role !== "owner")
    return <Alert error>Owner access is required.</Alert>;
  const data = resource.data;
  return (
    <div className={"owner-summary-page " + (route === "referrals" ? "owner-referral-page" : "")}>
      <div className="page-heading">
        <h1>
          {
            {
              subscription: "Center Pro subscription",
              referrals: "Printable referral pad",
              digest: "Owner summary",
            }[route]
          }
        </h1>
      </div>
      <LoadState resource={resource} retry={() => setRefresh((n) => n + 1)} />
      {data && (
        <section
          className={
            "panel " +
            (route === "referrals" ? "referral-paper" : "narrow-panel")
          }
        >
          {route === "subscription" ? (
            <>
              <h2>{data.plan}</h2>
              <dl>
                <dt>Per location</dt>
                <dd>{money(data.monthly_price)} / month</dd>
                <dt>Status</dt>
                <dd>Billing unavailable</dd>
                <dt>Invoices</dt>
                <dd>No invoices available</dd>
              </dl>
              <Alert>{data.detail}</Alert>
              <p>Patient scan payments are handled separately by the center.</p>
            </>
          ) : route === "referrals" ? (
            <>
              <h2>MySelfPay × {data.center}</h2>
              <p>Scan to review self-pay prices and request a time.</p>
              <img
                className="referral-qr"
                src={data.qr}
                alt="QR code linking to this center’s referral booking page"
              />
              <a href={data.url} target="_blank" rel="noreferrer">
                Open booking page
              </a>
              {data.local_only && (
                <Alert>
                  Preview QR only. Not available for patient use.
                </Alert>
              )}
              <div className="actions no-print">
                <button onClick={() => window.print()}>
                  <Icon name="print" /> Print referral pad
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>{data.center}</h2>
              <p>Last 30 days</p>
              <dl>
                <dt>Requests received</dt>
                <dd>{data.requests}</dd>
                <dt>Confirmed</dt>
                <dd>{data.confirmed}</dd>
                <dt>Outreach activities</dt>
                <dd>{data.outreach_activities}</dd>
                <dt>Collected revenue</dt>
                <dd>Unavailable</dd>
              </dl>
              <Alert>
                Email summaries are unavailable.
              </Alert>
              <button className="no-print" onClick={() => window.print()}>
                <Icon name="print" /> Print summary
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function patientDayHours(value, hours = []) {
  if (!value) return null;
  const day = new Date(value.slice(0, 10) + "T12:00:00Z").getUTCDay();
  return hours.find(row => row.weekday === (day + 6) % 7);
}
function patientHoursHint(value, hours) {
  if (!value) return "Choose a date to see working hours.";
  const day = patientDayHours(value, hours);
  if (!day) return "Working hours unavailable. Contact the center.";
  return day.closed ? "Closed on this day" : `Working hours: ${day.opens.slice(0, 5)} - ${day.closes.slice(0, 5)}`;
}

function patientPeriodError(value, hours) {
  if (!value.date || !value.period) return "Choose a date and period for each preference.";
  const day=patientDayHours(value.date,hours);
  if (!day || day.closed) return "The center is closed or working hours are unavailable on this date.";
  const [start,end]=value.period === "morning" ? ["08:00","12:00"] : ["12:00","17:00"];
  if (day.opens.slice(0,5)>=end || day.closes.slice(0,5)<=start) return "This period is outside center working hours.";
  return "";
}
