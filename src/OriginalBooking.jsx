import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { OTPInput, TimeSlotPicker } from "./BookingControls.jsx";
import { OriginalHTML } from "./App.jsx";
import { deliveryMessage } from "./booking-messages.js";
import ApprovalSlotPicker from "./ApprovalSlotPicker.jsx";
import { approvalReady } from "./approved-slot.js";
const call = (action, data) => api("/booking/" + action, data);
const zoneNames = {
  "America/New_York": "Eastern",
  "America/Chicago": "Central",
  "America/Denver": "Mountain",
  "America/Phoenix": "Arizona",
  "America/Los_Angeles": "Pacific",
  "America/Anchorage": "Alaska",
  "Pacific/Honolulu": "Hawaii",
};

export default function OriginalBooking({
  entry,
  offer,
  search,
  account,
  onClose,
  notify,
  onRequirePhone,
}) {
  const [options, setOptions] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(() => ({
    clinic_id: entry.booking_id,
    offer_id: offer?.id || "",
    clinic_name: entry.name,
    location: entry.area,
    slots: [],
    timezone: "America/New_York",
    price_text: "",
    service: search.mod || "Please contact me",
    exam: search.body || "",
    contrast: search.contrast || "unknown",
    first_name: account?.name?.split(" ")[0] || "",
    phone: account?.phone || "",
    consent: false,
    idempotency_key: crypto.randomUUID(),
  }));
  useEffect(() => {
    let active = true;
    call("options", { clinic_id: entry.booking_id, offer_id: offer?.id || "" })
      .then((value) => {
        if (!active) return;
        setOptions(value);
        setDraft((old) => ({
          ...old,
          phone: value.phone,
          timezone: value.timezone || "America/New_York",
          price_text: value.price_text,
        }));
      })
      .catch((e) => {
        if (
          active &&
          onRequirePhone &&
          /US phone number|Verify your mobile number/i.test(e.message)
        ) {
          onRequirePhone();
          return;
        }
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [entry.booking_id, offer?.id]);
  const change = (key, value) => setDraft((old) => ({ ...old, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!draft.slots.length)
      return setError("Select at least one preferred time.");
    setBusy(true);
    setError("");
    try {
      const result = await call("create", draft);
      onClose();
      notify(deliveryMessage(result.delivery, result.notification_target));
      location.hash = `request/${result.id}/${result.tracking_token}`;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="pdf-booking-flow">
      <div className="flow-topbar">
        <button
          type="button"
          className="flow-back"
          aria-label="Back to results"
          onClick={onClose}
        >
          ‹
        </button>
        <h2 id="dialogTitle">Request a Time</h2>
        <button
          type="button"
          className="flow-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {!options ? (
        <div className="flow-content">
          <section className="flow-card">
            <h3>
              {error ? "Request unavailable" : "Loading request details…"}
            </h3>
            <p role="alert">{error}</p>
            {account?.setup_required && (
              <a href="#login" onClick={onClose}>
                Verify your US phone number
              </a>
            )}
          </section>
        </div>
      ) : (
        <form className="flow-form" id="bookingSlots" onSubmit={submit}>
          <div className="flow-content">
            <section className="flow-card flow-clinic">
              <h3>{draft.clinic_name}</h3>
              <p>{draft.price_text}</p>
              {options.notification_target === "support" && (
                <p className="flow-help">
                  MySelfPay Patient Care will receive this request and follow up
                  with the center. The center must confirm your appointment.
                </p>
              )}
            </section>
            <TimeSlotPicker
              draft={draft}
              options={options}
              disabled={busy}
              onError={setError}
              onSlots={(slots) => change("slots", slots)}
            />
            <p className="flow-help flow-time-note">
              {zoneNames[draft.timezone]} time · Preferred times; the center
              confirms availability.
            </p>
            <section className="flow-card flow-contact">
              <label className="flow-label">
                First name (optional)
                <input
                  id="bookingName"
                  autoComplete="given-name"
                  maxLength={80}
                  disabled={busy}
                  value={draft.first_name}
                  onChange={(e) => change("first_name", e.target.value)}
                />
              </label>
              <p className="flow-verified">
                Verified mobile number: <strong>{draft.phone}</strong>
              </p>
              <label className="flow-consent">
                <input
                  id="bookingConsent"
                  type="checkbox"
                  required
                  disabled={busy}
                  checked={draft.consent}
                  onChange={(e) => change("consent", e.target.checked)}
                />
                <span>
                  {draft.clinic_name} may call or text me at {draft.phone} about
                  this appointment request.
                </span>
              </label>
            </section>
            <p id="bookingError" className="flow-error" role="alert">
              {error}
            </p>
          </div>
          <div className="flow-bottom-action">
            <button
              id="bookingSubmit"
              className="flow-primary"
              disabled={busy || options.delivery === "unavailable"}
            >
              {busy ? "Sending request…" : "Send request"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function OriginalBookingLink({ route, ui }) {
  const [kind, id, token] = route.split("/");
  const initialCode = useRef(null);
  const [appointment, setAppointment] = useState(null);
  useEffect(() => setAppointment(null), [id, token]);
  const [resendAt, setResendAt] = useState(0);
  const [resendLeft, setResendLeft] = useState(0);
  useEffect(() => {
    const tick = () =>
      setResendLeft(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  const [value, setValue] = useState(null),
    [session, setSession] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [remaining, setRemaining] = useState(0);
  useEffect(() => {
    setValue(null);
    setSession("");
    setError("");
    let active = true;
    async function refresh() {
      try {
        const result = await call("patient", { id, token });
        if (active) setValue(result);
      } catch (e) {
        if (active) setError(e.message);
      }
    }
    if (kind !== "clinic") void refresh();
    const timer = kind !== "clinic" ? setInterval(refresh, 15000) : null;
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [kind, id, token]);
  useEffect(() => {
    if (kind !== "clinic" || !id || !token) return;
    let active = true;
    const key = JSON.stringify([id, token]);
    // Reuse the in-flight request during React StrictMode's effect replay.
    if (initialCode.current?.key !== key) {
      initialCode.current = { key, promise: call("code", { id, token }) };
    }
    setBusy(true);
    setMessage("Sending your verification code…");
    initialCode.current.promise
      .then((result) => {
        if (!active) return;
        setResendAt(Date.now() + (result.resend_after || 60) * 1000);
        setMessage(
          result.delivery === "sent"
            ? "A verification code was emailed to the center. It expires in 10 minutes."
            : "Email delivery is disabled. No code was sent.",
        );
      })
      .catch((e) => {
        if (!active) return;
        setMessage("");
        setError(e.message);
        if (e.status === 429)
          setResendAt(Date.now() + (e.retryAfter || 60) * 1000);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [kind, id, token]);
  useEffect(() => {
    if (kind !== "clinic" || !session) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const result = await call("details", { id, session });
        if (active) setValue(result);
      } catch (e) {
        if (active) setError(e.message);
      }
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [kind, id, session]);
  useEffect(() => {
    if (!session || !value) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil(value.expires_at - Date.now() / 1000));
      setRemaining(left);
      if (!left) {
        setSession("");
        setValue(null);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session, value]);
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
  function click(event) {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.id === "copyBookingLink") {
      event.preventDefault();
      void navigator.clipboard
        .writeText(location.href)
        .then(() => setMessage("Request link copied."))
        .catch(() =>
          setMessage(
            "Bookmark this page or copy the address from your browser.",
          ),
        );
    }
    if (button.id === "clinicCodeSend") {
      event.preventDefault();
      void run(async () => {
        const result = await call("code", { id, token });
        setCode("");
        setResendAt(Date.now() + (result.resend_after || 60) * 1000);
        setMessage(
          result.delivery === "sent"
            ? "A verification code was emailed to the center. It expires in 10 minutes."
            : "Email delivery is disabled. No code was sent.",
        );
      });
    }
    if (button.id === "clinicLock") {
      event.preventDefault();
      void run(async () => {
        await call("lock", { id, session });
        setSession("");
        setValue(null);
      });
    }
    if (button.dataset.bookingStatus) {
      event.preventDefault();
      void run(async () =>
        setValue(
          await call("status", {
            id,
            session,
            status: button.dataset.bookingStatus,
            ...(button.dataset.bookingStatus === "scheduled"
              ? { appointment }
              : {}),
          }),
        ),
      );
    }
  }
  function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    void run(async () => {
      const result = await call("verify", { id, token, code });
      setValue(await call("details", { id, session: result.session }));
      setSession(result.session);
    });
  }
  const replace = (node) => {
    const name = node.attribs.id;
    if (name === "clinicAppointment" && value)
      return (
        <ApprovalSlotPicker
          request={value}
          value={appointment}
          onChange={setAppointment}
          disabled={busy}
        />
      );
    if (node.attribs["data-booking-status"] === "scheduled")
      return (
        <button
          className="flow-dark"
          data-booking-status="scheduled"
          disabled={busy || !approvalReady(appointment)}
        >
          Approve request
        </button>
      );
    if (name === "clinicError")
      return (
        <p id={name} role="alert">
          {error}
        </p>
      );
    if (name === "clinicCodeStatus" || name === "bookingActionStatus")
      return (
        <p id={name} role="status">
          {message}
        </p>
      );
    if (name === "clinicCountdown")
      return (
        <p id={name} role="timer">
          Session ends in {Math.floor(remaining / 60)}:
          {String(remaining % 60).padStart(2, "0")}
        </p>
      );
    if (name === "clinicCodeSend")
      return (
        <button
          type="button"
          id={name}
          className="flow-dark"
          disabled={busy || resendLeft > 0}
        >
          {busy
            ? "Please wait…"
            : resendLeft > 0
              ? `Resend code in ${resendLeft}s`
              : "Resend code"}
        </button>
      );
    if (name === "clinicCode")
      return (
        <OTPInput
          id="clinicCode"
          label="Center email OTP"
          value={code}
          onChange={setCode}
          disabled={busy}
        />
      );
    if (name === "clinicVerifyButton")
      return (
        <button
          id={name}
          className="flow-dark"
          disabled={busy || !/^\d{6}$/.test(code)}
        >
          Open request
        </button>
      );
    return undefined;
  };
  let html =
    kind === "clinic"
      ? session && value
        ? ui.clinicPage(value, id)
        : ui.clinicGate(id, token)
      : value
        ? ui.receipt(value, token)
        : '<section class="panel booking-page"><h1>Appointment request</h1><p role="status">Loading request details…</p></section>';
  if (
    value &&
    kind !== "clinic" &&
    value.status === "requested" &&
    (value.delivery !== "sent" || value.notification_target === "support")
  ) {
    html = html.replace("Request sent", "Request saved");
    html = html.replace(
      "The center will call or text you about your appointment request.",
      ui.esc(deliveryMessage(value.delivery, value.notification_target)),
    );
  }
  if (kind === "clinic" && error && /expired/i.test(error))
    html = `<section class="reference-request-page"><section class="flow-card"><p class="eyebrow">REQUEST ${ui.esc(id)}</p><h1>This link has expired</h1><p>Contact MySelfPay for help with this appointment request.</p><a class="flow-dark" href="/contact">Contact MySelfPay</a><p id="clinicError" role="alert"></p></section></section>`;
  return (
    <div onClick={click} onSubmit={submit}>
      <OriginalHTML html={html} replace={replace} disabled={busy} />
      {kind !== "clinic" && error && <p role="alert">{error}</p>}
    </div>
  );
}
