import { useState } from "react";
import { api, establishSession } from "./api.js";
import { OTPInput } from "./BookingControls.jsx";
import { CALLING_CODES, phoneInput } from "./phone-country.js";
import "./mobile-account.css";

const prettyPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  const us = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits.length === 10 ? digits : "";
  return us ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : value;
};

export default function MobileAccount({
  signup,
  account,
  onDone,
  requestOnly = false,
  facility = "",
}) {
  const [name, setName] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [country, setCountry] = useState("US");
  const [national, setNational] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const phone = phoneInput(country, national).phone;
  const [existing, setExisting] = useState(false);
  const intent = requestOnly
    ? "request"
    : signup && !existing
      ? "register"
      : "login";
  const creating = intent === "register";
  const payload = {
    intent,
    phone,
    ...(creating ? { name } : {}),
  };
  const Heading = requestOnly ? "h2" : "h1";
  function changePhone(nextCountry, value) {
    const parsed = phoneInput(nextCountry, value);
    setCountry(parsed.country);
    setNational(parsed.national);
    setChallenge(null);
    setExisting(false);
    setCode("");
    setError("");
  }
  async function send() {
    try {
      setChallenge(await api("/auth/mobile/code", payload));
    } catch (e) {
      // A returning member who chose "Create account" is logged in with the
      // same number instead of being sent back to start over.
      if (creating && e.status === 409 && /already registered/i.test(e.message)) {
        setExisting(true);
        setChallenge(
          await api("/auth/mobile/code", { intent: "login", phone }),
        );
      } else throw e;
    }
    setCode("");
  }
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
  function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    void run(async () => {
      if (!challenge) return send();
      const result = await establishSession("/auth/mobile/verify", {
        ...payload,
        challenge: challenge.challenge,
        verification_id: challenge.verification_id,
        code,
      });
      await onDone(result.member);
    });
  }
  return (
    <section
      className={
        requestOnly ? "mobile-account request-phone" : "mobile-account panel"
      }
    >
      <Heading id={requestOnly ? "dialogTitle" : undefined}>
        {facility && !requestOnly
          ? `Request a time at ${facility}`
          : challenge
            ? "Verify your mobile number"
            : requestOnly
              ? "Verify your phone to request a time"
              : signup
                ? "Create an account"
                : "Welcome back"}
      </Heading>
      <p>
        {challenge
          ? existing
            ? `This number already has an account. Enter the 6-digit code we texted to ${prettyPhone(challenge.phone || phone)}.`
            : `Enter the 6-digit code we texted to ${prettyPhone(challenge.phone || phone)}.`
          : requestOnly
            ? "Enter your mobile number and we text you a code. No password."
            : signup
              ? "Enter your first name and mobile number. We text you a code."
              : "Enter your mobile number. We text you a code."}
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {!challenge ? (
            <>
              {signup && !requestOnly && (
                <label>
                  First name
                  <input
                    id="accountName"
                    autoComplete="given-name"
                    required
                    maxLength={100}
                    value={name}
                    placeholder={nameFocused ? "" : "Enter your name"}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}
              <div className="mobile-account-phone">
                {
                  <label>
                    Country code
                    <select
                      aria-label="Country code"
                      value={country}
                      onChange={(e) => changePhone(e.target.value, national)}
                    >
                      {CALLING_CODES.map((c) => (
                        <option key={c.country} value={c.country}>
                          {c.name} (+{c.dial})
                        </option>
                      ))}
                    </select>
                  </label>
                }
                <label>
                  Mobile number
                  <input
                    id="accountPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    required
                    placeholder="Enter mobile number"
                    maxLength={requestOnly ? 30 : undefined}
                    value={national}
                    onChange={(e) => changePhone(country, e.target.value)}
                  />
                </label>
              </div>
            </>
          ) : (
            <section className="mobile-otp">
              <OTPInput
                id="registrationOTP"
                label="Mobile verification code"
                value={code}
                onChange={(value) => {
                  setCode(value);
                  setError("");
                }}
                disabled={busy}
              />
              <div className="mobile-otp-actions">
                <button type="button" onClick={() => void run(send)}>
                  Send a new code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChallenge(null);
                    setExisting(false);
                    setCode("");
                    setError("");
                  }}
                >
                  Use a different number
                </button>
              </div>
            </section>
          )}
          {error && (
            <p className="flow-error" role="alert">
              {error}
            </p>
          )}
          <button
            id="accountSubmit"
            className="primary mobile-account-submit"
            disabled={busy || (challenge && !/^\d{6}$/.test(code))}
          >
            {busy
              ? "Please wait…"
              : challenge
                ? requestOnly
                  ? "Verify and continue"
                  : creating
                    ? facility ? `Verify and request a time at ${facility}` : "Verify and create account"
                    : facility ? `Verify and request a time at ${facility}` : "Verify and log in"
                : "Text me a code"}
          </button>
          {!challenge && (
            <p className="small muted mobile-consent-note">
              Message and data rates may apply. We use your number only for this request. <a href="/privacy-terms">Terms &amp; Privacy</a>
            </p>
          )}
        </fieldset>
      </form>
      {!requestOnly && !challenge && (
        <p>
          {signup ? (
            <>
              Already registered? <a href="#login">Log in</a>
            </>
          ) : (
            <>
              New to MySelfPay? <a href="#signup">Create an account</a>
            </>
          )}
        </p>
      )}
    </section>
  );
}
