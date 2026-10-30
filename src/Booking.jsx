import { cloneElement, useEffect, useId, useRef, useState } from "react";
import { api } from "./api.js";
import { contrastLabel } from "./format.js";

const call = (action, data) => api("/booking/" + action, data);
function Field({ label, children }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
function Summary({ value }) {
  return (
    <>
      <h2>{value.clinic_name}</h2>
      <dl>
        <dt>Request</dt>
        <dd>{value.id}</dd>
        <dt>Status</dt>
        <dd>{value.status}</dd>
        <dt>Exam</dt>
        <dd>
          {value.service} · {value.exam} · {contrastLabel(value.contrast)}
        </dd>
        <dt>Preferred times</dt>
        <dd>
          {value.slots?.map((s) => (
            <div key={s.date + s.period}>
              {s.date} · {s.period}
            </div>
          ))}
          {value.timezone}
        </dd>
        <dt>Price</dt>
        <dd>{value.price_text}</dd>
      </dl>
      <p className="notice">
        Testing mode: clinic notification delivery is disabled. This is a
        recorded request, not a confirmed appointment. Contact the facility
        directly.
      </p>
    </>
  );
}

export default function Booking({ entry, offer, onClose }) {
  const [options, setOptions] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [issued, setIssued] = useState(null),
    [proof, setProof] = useState(null),
    [receipt, setReceipt] = useState(null);
  const [zone, setZone] = useState("America/New_York"),
    [slots, setSlots] = useState([{ date: "", period: "morning" }]);
  const key = useRef(crypto.randomUUID()),
    first = useRef(null),
    dialog = useRef(null);
  useEffect(() => {
    first.current?.focus();
    let active = true;
    call("options", { clinic_id: entry.booking_id, offer_id: offer?.id || "" })
      .then((value) => {
        if (active) setOptions(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [entry.booking_id, offer?.id]);
  useEffect(() => {
    const previous = document.activeElement;
    const keydown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll(
          "button:not(:disabled),input:not(:disabled),select,textarea,a[href]",
        );
        if (!nodes?.length) return;
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes[nodes.length - 1].focus();
        } else if (
          !e.shiftKey &&
          document.activeElement === nodes[nodes.length - 1]
        ) {
          e.preventDefault();
          nodes[0].focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [onClose]);
  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function create(e) {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    await run(async () => {
      const value = await call("create", {
        ...fields,
        ...proof,
        timezone: zone,
        slots,
        consent: fields.consent === "on",
        clinic_id: entry.booking_id,
        offer_id: offer?.id || "",
        idempotency_key: key.current,
      });
      setReceipt(value);
    });
  }
  return (
    <div ref={dialog}>
      <button
        className="close"
        onClick={onClose}
        ref={first}
        aria-label="Close appointment request"
      >
        ×
      </button>
      <p className="eyebrow">APPOINTMENT REQUEST</p>
      <h1 id="booking-title">
        {receipt ? "Your request is recorded" : entry.name}
      </h1>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {receipt ? (
        <>
          <Summary value={receipt} />
          <a
            className="button primary"
            onClick={onClose}
            href={`#booking/${receipt.id}/${receipt.tracking_token}`}
          >
            View request status
          </a>
        </>
      ) : (
        <>
          <p className="notice">
            Clinic delivery is disabled during testing. This form records a
            request only. Call the center to arrange care.
          </p>
          <p>{options?.price_text}</p>
          {!proof ? (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () =>
                    setIssued(await call("email-code", { email })),
                  );
                }}
              >
                <Field label="Patient email address">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setIssued(null);
                    }}
                    autoComplete="email"
                  />
                </Field>
                <button disabled={busy || !options}>
                  {issued
                    ? "Resend verification code"
                    : "Send verification code"}
                </button>
              </form>
              {issued && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () =>
                      setProof(
                        await call("email-verify", {
                          verification_id: issued.verification_id,
                          code,
                        }),
                      ),
                    );
                  }}
                >
                  <Field label="Email verification code">
                    <input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      autoComplete="one-time-code"
                    />
                  </Field>
                  <button className="primary" disabled={busy}>
                    Verify email
                  </button>
                </form>
              )}
            </>
          ) : (
            <form onSubmit={create}>
              <p className="success">Email verified for this request.</p>
              <Field label="First name">
                <input
                  name="first_name"
                  required
                  maxLength={80}
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Phone number">
                <input
                  name="phone"
                  type="tel"
                  required
                  maxLength={30}
                  autoComplete="tel"
                />
              </Field>
              <Field label="Imaging service">
                <select name="service" defaultValue={offer?.mod || "MRI"}>
                  {["MRI", "CT", "Other imaging", "Please contact me"].map(
                    (v) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Ordered exam">
                <input name="exam" maxLength={100} />
              </Field>
              <Field label="Contrast">
                <select
                  name="contrast"
                  defaultValue={offer?.contrast || "unknown"}
                >
                  {["unknown", "without", "with", "both"].map((v) => (
                    <option key={v} value={v}>
                      {contrastLabel(v)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Clinic time zone">
                <select value={zone} onChange={(e) => setZone(e.target.value)}>
                  {Object.entries(options?.zones || {}).map(
                    ([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <h2>Preferred times</h2>
              {slots.map((slot, index) => (
                <div className="slot" key={index}>
                  <Field label={`Preferred date ${index + 1}`}>
                    <input
                      type="date"
                      required
                      min={options?.today?.[zone]}
                      value={slot.date}
                      onChange={(e) =>
                        setSlots((old) =>
                          old.map((s, i) =>
                            i === index ? { ...s, date: e.target.value } : s,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label={`Time window ${index + 1}`}>
                    <select
                      value={slot.period}
                      onChange={(e) =>
                        setSlots((old) =>
                          old.map((s, i) =>
                            i === index ? { ...s, period: e.target.value } : s,
                          ),
                        )
                      }
                    >
                      <option value="morning">Morning (8 am–12 pm)</option>
                      <option value="afternoon">Afternoon (12–5 pm)</option>
                    </select>
                  </Field>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSlots((old) => old.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {slots.length < 3 && (
                <button
                  type="button"
                  onClick={() =>
                    setSlots((old) => [...old, { date: "", period: "morning" }])
                  }
                >
                  Add preferred time
                </button>
              )}
              <label className="check">
                <input type="checkbox" name="consent" required />I consent to
                the clinic contacting me about this request and understand that
                my contact and request details are stored encrypted.
              </label>
              <button className="primary" disabled={busy}>
                Record appointment request
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export function BookingLink({ route, onError }) {
  const [kind, id, token] = route.split("/"),
    [value, setValue] = useState(null),
    [session, setSession] = useState(""),
    [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function action(name, extra = {}) {
    setBusy(true);
    try {
      const result = await call(name, { id, token, session, ...extra });
      if (name === "verify") {
        setSession(result.session);
        setValue(await call("details", { id, session: result.session }));
      } else if (name === "code")
        setMessage(
          "Clinic verification delivery is currently disabled in testing mode. Contact the service operator.",
        );
      else if (name === "lock") {
        setSession("");
        setValue(null);
        setMessage("Session locked.");
      } else setValue(result);
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setValue(null);
    setSession("");
    setMessage("");
    let active = true;
    if (kind === "booking")
      call("patient", { id, token })
        .then((result) => {
          if (active) setValue(result);
        })
        .catch((e) => {
          if (active) onError(e.message);
        });
    return () => {
      active = false;
    };
  }, [kind, id, token]);
  return (
    <section className="panel narrow">
      <h1>
        {kind === "booking"
          ? "Appointment request status"
          : "Clinic request access"}
      </h1>
      {value ? (
        <>
          <Summary value={value} />
          {session && (
            <>
              <p>
                Patient: {value.first_name} ·{" "}
                <a href={"tel:" + value.phone}>{value.phone}</a>
              </p>
              <div className="actions">
                {["voicemail", "scheduled", "unable"].map((status) => (
                  <button
                    key={status}
                    disabled={busy}
                    onClick={() => action("status", { status })}
                  >
                    {status}
                  </button>
                ))}
                <button onClick={() => action("lock")} disabled={busy}>
                  Lock session
                </button>
              </div>
            </>
          )}
          <button
            disabled={busy}
            onClick={() => action(session ? "details" : "patient")}
          >
            Refresh status
          </button>
        </>
      ) : kind === "clinic" ? (
        <>
          <p className="notice">
            Clinic notifications and verification-code delivery are currently
            disabled during testing.
          </p>
          <button disabled={busy} onClick={() => action("code")}>
            Request clinic access code
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action("verify", { code });
            }}
          >
            <Field label="Clinic access code">
              <input
                value={code}
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>
            <button disabled={busy}>Verify code</button>
          </form>
        </>
      ) : (
        <p role="status">Loading request…</p>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
