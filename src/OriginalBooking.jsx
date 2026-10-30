import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { OriginalHTML } from "./App.jsx";
const call = (action, data) => api("/booking/" + action, data);

export default function OriginalBooking({
  entry,
  offer,
  search,
  ui,
  onClose,
  notify,
}) {
  const [options, setOptions] = useState(null),
    [step, setStep] = useState(1),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [date, setDate] = useState(""),
    [code, setCode] = useState("");
  const [draft, setDraft] = useState(() => ({
    clinic_id: entry.booking_id,
    offer_id: offer?.id || "",
    price_text: "",
    clinic_name: entry.name,
    location: entry.area,
    slots: [],
    timezone: "",
    service: search.mod || "Please contact me",
    exam: search.body || "",
    contrast: search.contrast || "unknown",
    first_name: "",
    phone: "",
    email: "",
    consent: false,
    idempotency_key: crypto.randomUUID(),
  }));
  const root = useRef(null);
  useEffect(() => {
    let active = true;
    call("options", { clinic_id: entry.booking_id, offer_id: offer?.id || "" })
      .then((value) => {
        if (active) {
          setOptions(value);
          setDraft((old) => ({ ...old, price_text: value.price_text }));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [entry.booking_id, offer?.id]);
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
  function change(event) {
    const { id, value, checked } = event.target;
    if (id === "bookingDate") {
      setDate(value);
      return;
    }
    if (id === "patientEmailCode") {
      setCode(value);
      return;
    }
    const keys = {
      bookingZone: "timezone",
      bookingService: "service",
      bookingExam: "exam",
      bookingContrast: "contrast",
      bookingName: "first_name",
      bookingPhone: "phone",
      bookingEmail: "email",
      bookingConsent: "consent",
    };
    const field = keys[id];
    if (!field) return;
    setDraft((old) => ({
      ...old,
      [field]: field === "consent" ? checked : value,
      ...(field === "email"
        ? { verification_id: undefined, verification_token: undefined }
        : {}),
      ...(["service", "exam", "contrast"].includes(field)
        ? {
            offer_id: "",
            price_text:
              "Clinic will confirm the exact total for the selected exam.",
          }
        : {}),
    }));
    if (field === "email") setStatus("Verify this email before submitting.");
  }
  function click(event) {
    const button = event.target.closest("button");
    if (!button) return;
    const id = button.id;
    if (button.dataset.addSlot) {
      event.preventDefault();
      if (
        !draft.timezone ||
        !date ||
        !root.current.querySelector("#bookingDate").checkValidity()
      )
        return setError(
          "Choose the clinic’s time zone and a date within the next 90 days.",
        );
      if (draft.slots.length === 3)
        return setError(
          "Choose at most 3 times. Remove a time to select another.",
        );
      if (
        draft.slots.some(
          (x) => x.date === date && x.period === button.dataset.addSlot,
        )
      )
        return setError("That time is already selected.");
      setError("");
      setDraft((old) => ({
        ...old,
        slots: [...old.slots, { date, period: button.dataset.addSlot }],
      }));
      return;
    }
    if (button.dataset.removeSlot !== undefined) {
      event.preventDefault();
      setDraft((old) => ({
        ...old,
        slots: old.slots.filter(
          (_, index) => index !== Number(button.dataset.removeSlot),
        ),
      }));
      return;
    }
    if (id === "bookingBack") {
      event.preventDefault();
      setStep(1);
      setError("");
      return;
    }
    if (id === "patientCodeSend") {
      event.preventDefault();
      if (!root.current.querySelector("#bookingEmail").reportValidity()) return;
      void run(async () => {
        setStatus("Sending verification code…");
        const value = await call("email-code", { email: draft.email });
        setDraft((old) => ({
          ...old,
          verification_id: value.verification_id,
          verification_token: undefined,
        }));
        setStatus(
          "Code sent. Check your inbox and spam folder. It expires in 10 minutes.",
        );
      });
      return;
    }
    if (id === "patientCodeVerify") {
      event.preventDefault();
      if (!draft.verification_id) return setStatus("Request a code first.");
      void run(async () => {
        const value = await call("email-verify", {
          verification_id: draft.verification_id,
          code,
        });
        setDraft((old) => ({
          ...old,
          verification_token: value.verification_token,
        }));
        setCode("");
        setStatus("Email verified. Submit your request within 15 minutes.");
      });
    }
  }
  function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    if (step === 1) {
      if (!draft.slots.length)
        return setError("Select at least one preferred time.");
      setError("");
      setStep(2);
      return;
    }
    void run(async () => {
      const result = await call("create", draft);
      onClose();
      notify("No email sent to clinic (testing mode)");
      location.hash = `request/${result.id}/${result.tracking_token}`;
    });
  }
  let html = options
    ? step === 1
      ? ui.bookingSlots(draft, options)
      : ui.bookingContact(draft, options)
    : '<h2>Book appointment</h2><p role="status">Loading request details…</p>';
  html = html.replace("<h2>", '<h2 id="dialogTitle">');
  const replace = (node) => {
    const id = node.attribs.id;
    if (id === "bookingError")
      return (
        <p id="bookingError" role="alert">
          {error}
        </p>
      );
    if (id === "patientEmailStatus")
      return (
        <p id="patientEmailStatus" role="status">
          {status}
        </p>
      );
    if (id === "bookingSelected")
      return (
        <div id="bookingSelected">
          <p role="status">{draft.slots.length} of 3 times selected</p>
          {draft.slots.map((slot, index) => (
            <div className="booking-slot" key={slot.date + slot.period}>
              <span>
                {new Date(slot.date + "T12:00:00").toLocaleDateString(
                  undefined,
                  { weekday: "short", month: "short", day: "numeric" },
                )}{" "}
                ·{" "}
                {slot.period === "morning"
                  ? "Morning (8 am–12 pm)"
                  : "Afternoon (12–5 pm)"}
              </span>
              <button type="button" data-remove-slot={index}>
                Remove
              </button>
            </div>
          ))}
        </div>
      );
    if (id === "bookingDate") {
      let max;
      if (draft.timezone) {
        const value = new Date(options.today[draft.timezone] + "T12:00:00Z");
        value.setUTCDate(value.getUTCDate() + 90);
        max = value.toISOString().slice(0, 10);
      }
      return (
        <input
          type="date"
          id="bookingDate"
          value={date}
          min={options.today[draft.timezone]}
          max={max}
          onChange={change}
        />
      );
    }
    if (id === "patientEmailCode")
      return (
        <input
          id={id}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]{6}"
          value={code}
          onChange={change}
        />
      );
    return undefined;
  };
  return (
    <div ref={root} onClick={click} onSubmit={submit}>
      <OriginalHTML
        html={html}
        onInput={change}
        replace={replace}
        disabled={busy}
      />
      {!options && error && <p role="alert">{error}</p>}
    </div>
  );
}

export function OriginalBookingLink({ route, ui }) {
  const [kind, id, token] = route.split("/");
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
        await call("code", { id, token });
        setMessage("Email delivery is disabled. No code was sent.");
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
    if (name === "clinicCode")
      return (
        <input
          id={name}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      );
    return undefined;
  };
  const html =
    kind === "clinic"
      ? session && value
        ? ui.clinicPage(value, id)
        : ui.clinicGate(id, token)
      : value
        ? ui.receipt(value, token)
        : '<section class="panel booking-page"><h1>Appointment request</h1><p role="status">Loading request details…</p></section>';
  return (
    <div onClick={click} onSubmit={submit}>
      <OriginalHTML html={html} replace={replace} disabled={busy} />
      {kind !== "clinic" && error && <p role="alert">{error}</p>}
    </div>
  );
}
