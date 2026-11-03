import { useEffect, useState } from "react";
import { api } from "./api.js";
import { OTPInput, TimeSlotPicker } from "./BookingControls.jsx";
import { CALLING_CODES, phoneInput } from "./phone-country.js";
import { OriginalHTML } from "./App.jsx";
import { deliveryMessage } from "./booking-messages.js";
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
}) {
  const [options, setOptions] = useState(null),
    [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [code, setCode] = useState(""),
    [status, setStatus] = useState(""),
    [phoneCode, setPhoneCode] = useState(""),
    [phoneStatus, setPhoneStatus] = useState(""),
    [phoneCountry, setPhoneCountry] = useState("US"),
    [nationalPhone, setNationalPhone] = useState("");
  const [draft, setDraft] = useState(() => ({
    clinic_id: entry.booking_id,
    offer_id: offer?.id || "",
    clinic_name: entry.name,
    location: entry.area,
    price_text: "",
    slots: [],
    timezone: "America/New_York",
    service: search.mod || "Please contact me",
    exam: search.body || "",
    contrast: search.contrast || "unknown",
    first_name: "",
    phone: "",
    email: account?.email || "",
    consent: false,
    idempotency_key: crypto.randomUUID(),
  }));
  const verified =
    !!draft.email &&
    (draft.saved_verified_email === draft.email || !!draft.verification_token);
  useEffect(() => {
    let active = true;
    call("options", { clinic_id: entry.booking_id, offer_id: offer?.id || "" })
      .then((value) => {
        if (!active) return;
        if (value.delivery === "unavailable") {
          setError(
            "Online booking is not enabled for this center. Please contact the facility directly.",
          );
          return;
        }
        setOptions(value);
        setDraft((old) => ({
          ...old,
          price_text: value.price_text,
          timezone: value.timezone || "America/New_York",
          ...(value.verified_email
            ? {
                email: value.verified_email,
                saved_verified_email: value.verified_email,
              }
            : {}),
        }));
        if (value.verified_email) setStep(1);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [entry.booking_id, offer?.id]);
  const change = (field, value) =>
    setDraft((old) => ({ ...old, [field]: value }));
  async function run(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function phoneChange(country, input) {
    const parsed = phoneInput(country, input);
    setPhoneCountry(parsed.country);
    setNationalPhone(parsed.national);
    setDraft((old) => ({
      ...old,
      phone: parsed.phone,
      phone_verification_id: undefined,
      phone_verification_token: undefined,
    }));
    setPhoneCode("");
    setPhoneStatus("");
  }
  function sendEmail() {
    void run(async () => {
      const result = await call("email-code", { email: draft.email });
      setDraft((old) => ({
        ...old,
        verification_id: result.verification_id,
        verification_token: undefined,
      }));
      setCode("");
      setStatus("Code sent. Check your inbox and spam folder.");
    });
  }
  function verifyEmail() {
    void run(async () => {
      const result = await call("email-verify", {
        verification_id: draft.verification_id,
        code,
      });
      setDraft((old) => ({
        ...old,
        verification_token: result.verification_token,
        saved_verified_email: old.email,
      }));
      setStatus("Email verified successfully.");
      setCode("");
    });
  }
  function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    if (step === 0) {
      if (verified) {
        setError("");
        setStep(1);
      } else if (draft.verification_id) verifyEmail();
      else sendEmail();
      return;
    }
    if (!verified) {
      setStep(0);
      setError("Verify your email to continue.");
      return;
    }
    if (!draft.slots.length) {
      setError("Select at least one preferred time.");
      return;
    }
    void run(async () => {
      try {
        const result = await call("create", {
          ...draft,
          ...(!draft.phone_verification_token
            ? {
                phone_verification_id: undefined,
                phone_verification_token: undefined,
              }
            : {}),
        });
        onClose();
        notify(deliveryMessage(result.delivery));
        location.hash = `request/${result.id}/${result.tracking_token}`;
      } catch (e) {
        if (e.status === 403 && /verif/i.test(e.message)) {
          if (/mobile|phone/i.test(e.message))
            setDraft((old) => ({
              ...old,
              phone_verification_id: undefined,
              phone_verification_token: undefined,
            }));
          else {
            setDraft((old) => ({
              ...old,
              saved_verified_email: undefined,
              verification_token: undefined,
              verification_id: undefined,
            }));
            setStep(0);
          }
        }
        throw e;
      }
    });
  }
  const back = () => {
    if (step === 0 && draft.verification_id && !verified) {
      setDraft((old) => ({ ...old, verification_id: undefined }));
      setCode("");
      setStatus("");
      setError("");
    } else onClose();
  };
  return (
    <div className="pdf-booking-flow">
      <div className="flow-topbar">
        <button
          type="button"
          className="flow-back"
          id="bookingTimeBack"
          aria-label="Back to results"
          onClick={back}
        >
          ‹
        </button>
        <h2 id="dialogTitle">
          {step === 0 && !verified && draft.verification_id
            ? "Verify your email"
            : "Request a time"}
        </h2>
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
            {error && <p role="alert">{error}</p>}
          </section>
        </div>
      ) : (
        <form
          className="flow-form"
          id={step === 0 ? "bookingVerification" : "bookingSlots"}
          onSubmit={submit}
        >
          <div className="flow-content">
            {step === 0 ? (
              <>
                <section className="flow-card booking-verification-gate">
                  <h3>
                    {verified
                      ? "Your email is verified"
                      : draft.verification_id
                        ? "Enter your code"
                        : "What’s your email address?"}
                  </h3>
                  {verified ? (
                    <p>Use this email for your appointment request.</p>
                  ) : draft.verification_id ? (
                    <p>
                      We emailed a 6-digit code to{" "}
                      <strong>{draft.email}</strong>. It works once, for 10
                      minutes.
                    </p>
                  ) : (
                    <p>
                      We’ll email you a code. The center can contact you at this
                      address about your request.
                    </p>
                  )}
                  {!draft.verification_id || verified ? (
                    <label className="flow-label" htmlFor="bookingEmail">
                      Email address
                      <input
                        id="bookingEmail"
                        type="email"
                        autoComplete="email"
                        maxLength={254}
                        required
                        value={draft.email}
                        disabled={busy}
                        onChange={(e) => {
                          setDraft((old) => ({
                            ...old,
                            email: e.target.value,
                            verification_id: undefined,
                            verification_token: undefined,
                          }));
                          setStatus("");
                        }}
                      />
                    </label>
                  ) : (
                    <OTPInput
                      id="patientEmailCode"
                      label="Email OTP"
                      value={code}
                      onChange={setCode}
                      disabled={busy}
                    />
                  )}
                  <p
                    id="patientEmailStatus"
                    className={verified ? "flow-verified" : "flow-help"}
                    role="status"
                  >
                    {status || (verified ? "Email verified successfully." : "")}
                  </p>
                  {!verified && draft.verification_id && (
                    <button
                      type="button"
                      id="patientCodeSend"
                      className="flow-text-button"
                      disabled={busy}
                      onClick={sendEmail}
                    >
                      Didn’t get it? Resend code
                    </button>
                  )}
                  {!verified && !draft.verification_id && (
                    <p className="flow-help">
                      Your verified email is saved to your account for future
                      requests.
                    </p>
                  )}
                </section>
                <details className="flow-card flow-mobile-optional">
                  <summary>Add a mobile number (optional)</summary>
                  <p>
                    The center may call this number. SMS verification is
                    optional.
                  </p>
                  <div className="booking-phone-fields">
                    <label className="flow-label">
                      Country code
                      <select
                        id="bookingPhoneCountry"
                        value={phoneCountry}
                        disabled={busy}
                        onChange={(e) =>
                          phoneChange(e.target.value, nationalPhone)
                        }
                      >
                        {CALLING_CODES.map((c) => (
                          <option key={c.country} value={c.country}>
                            {c.name} (+{c.dial})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flow-label">
                      Mobile number
                      <input
                        id="bookingPhone"
                        type="tel"
                        autoComplete="tel-national"
                        inputMode="tel"
                        value={nationalPhone}
                        disabled={busy}
                        onChange={(e) =>
                          phoneChange(phoneCountry, e.target.value)
                        }
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    id="patientPhoneSend"
                    disabled={
                      busy || !draft.phone || !!draft.phone_verification_token
                    }
                    onClick={() =>
                      void run(async () => {
                        const result = await call("phone-code", {
                          phone: draft.phone,
                        });
                        setDraft((old) => ({
                          ...old,
                          phone_verification_id: result.verification_id,
                          phone_verification_token: undefined,
                        }));
                        setPhoneStatus(
                          "SMS code sent. It expires in 10 minutes.",
                        );
                      })
                    }
                  >
                    Send mobile OTP
                  </button>
                  {draft.phone_verification_id &&
                    !draft.phone_verification_token && (
                      <>
                        <OTPInput
                          id="patientPhoneCode"
                          label="SMS OTP"
                          value={phoneCode}
                          onChange={setPhoneCode}
                          disabled={busy}
                        />
                        <button
                          type="button"
                          id="patientPhoneVerify"
                          disabled={busy || !/^\d{6}$/.test(phoneCode)}
                          onClick={() =>
                            void run(async () => {
                              const result = await call("phone-verify", {
                                verification_id: draft.phone_verification_id,
                                code: phoneCode,
                              });
                              setDraft((old) => ({
                                ...old,
                                phone_verification_token:
                                  result.verification_token,
                              }));
                              setPhoneStatus(
                                "Mobile number verified successfully.",
                              );
                            })
                          }
                        >
                          Verify mobile
                        </button>
                      </>
                    )}
                  <p
                    id="patientPhoneStatus"
                    role="status"
                    className="flow-help"
                  >
                    {phoneStatus}
                  </p>
                </details>
              </>
            ) : (
              <>
                <section className="flow-card flow-clinic">
                  <h3>{draft.clinic_name}</h3>
                  <p>
                    {[
                      draft.service !== "Please contact me"
                        ? draft.service
                        : "",
                      draft.exam,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {draft.service !== "Please contact me" || draft.exam
                      ? " · "
                      : ""}
                    {draft.price_text}
                  </p>
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
                    First name
                    <input
                      id="bookingName"
                      autoComplete="given-name"
                      maxLength={80}
                      value={draft.first_name}
                      required
                      disabled={busy}
                      onChange={(e) => change("first_name", e.target.value)}
                    />
                  </label>
                  <label className="flow-consent">
                    <input
                      id="bookingConsent"
                      type="checkbox"
                      checked={draft.consent}
                      required
                      disabled={busy}
                      onChange={(e) => change("consent", e.target.checked)}
                    />
                    <span>
                      {draft.clinic_name} may contact me
                      {draft.phone ? ` at ${draft.phone}` : " by email"} about
                      this appointment request.
                    </span>
                  </label>
                  <div className="flow-contact-email booking-verified-contacts">
                    <span>
                      Verified email
                      <br />
                      <strong>{draft.email}</strong>
                    </span>
                    <button
                      type="button"
                      id="editBookingContacts"
                      onClick={() => {
                        setStep(0);
                        setError("");
                      }}
                    >
                      Change
                    </button>
                  </div>
                </section>
              </>
            )}
            <p id="bookingError" className="flow-error" role="alert">
              {error}
            </p>
          </div>
          <div className="flow-bottom-action">
            {step === 0 ? (
              <button
                className="primary"
                type="submit"
                id={
                  verified
                    ? "continueBooking"
                    : draft.verification_id
                      ? "patientCodeVerify"
                      : "patientCodeSend"
                }
                disabled={
                  busy ||
                  (!verified &&
                    !!draft.verification_id &&
                    !/^\d{6}$/.test(code))
                }
              >
                {busy
                  ? "Please wait…"
                  : verified
                    ? "Continue to booking"
                    : draft.verification_id
                      ? "Verify email"
                      : "Send email OTP"}
              </button>
            ) : (
              <button
                type="submit"
                id="bookingSubmit"
                className="flow-primary"
                disabled={busy}
              >
                {busy ? "Sending request…" : "Send request"}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export function OriginalBookingLink({ route, ui }) {
  const [kind, id, token] = route.split("/");
  const [resendAt, setResendAt] = useState(0);
  const [resendLeft, setResendLeft] = useState(0);
  useEffect(() => {
    const tick = () => setResendLeft(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick(); const timer = setInterval(tick, 1000);
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
        setResendAt(Date.now() + (result.resend_after || 0) * 1000);
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
    if (name === "clinicCodeSend") return <button type="button" id={name} className="flow-text-button" disabled={busy || resendLeft > 0}>{resendLeft > 0 ? `Didn’t get it? Resend in 0:${String(resendLeft).padStart(2, "0")}` : message ? "Didn’t get it? Resend code" : "Send verification code"}</button>;
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
    value.delivery !== "sent"
  ) {
    html = html.replace("Request sent", "Request saved");
    html = html.replace(
      "The center will contact you by email or phone about your appointment request.",
      ui.esc(deliveryMessage(value.delivery)),
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
