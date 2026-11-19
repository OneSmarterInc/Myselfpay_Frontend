import { useState } from "react";
import { api, establishSession } from "./api.js";
import { OTPInput } from "./BookingControls.jsx";
import { CALLING_CODES, phoneInput } from "./phone-country.js";
import "./mobile-account.css";

export default function MobileAccount({
  signup,
  account,
  onDone,
  requestOnly = false,
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
        {challenge
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
            ? `This number already has an account. Enter the six-digit code we texted to ${challenge.phone || phone} to log in.`
            : `Enter the six-digit SMS code sent to ${challenge.phone || phone}.`
          : requestOnly
            ? "Select your country code and enter a phone number that can receive an SMS verification code. Your selected center will be kept."
            : signup
              ? "Enter your first name and mobile number to get started."
              : "Enter your registered mobile number. We’ll send you a login code."}
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
                  Resend code
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
                  Change mobile number
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
                    ? "Verify and create account"
                    : "Verify and log in"
                : requestOnly
                  ? "Send verification code"
                  : "Send mobile OTP"}
          </button>
        </fieldset>
      </form>
      {!requestOnly && (
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
