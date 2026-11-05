import { useState } from "react";
import { api } from "./api.js";
import { OTPInput } from "./BookingControls.jsx";
import { CALLING_CODES, phoneInput } from "./phone-country.js";
import "./mobile-account.css";

export default function PasswordReset({ onReset }) {
  const [step, setStep] = useState("details");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("US");
  const [national, setNational] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const phone = phoneInput(country, national).phone;
  function phoneChange(nextCountry, input) {
    const parsed = phoneInput(nextCountry, input);
    setCountry(parsed.country);
    setNational(parsed.national);
  }
  async function send() {
    const result = await api("/password/code", { username, phone });
    setChallenge(result);
    setCode("");
    setStep("code");
  }
  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
      if (e.status === 410 || e.status === 403) {
        setChallenge(null);
        setCode("");
        setStep("details");
      }
    } finally {
      setBusy(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    if (step === "password" && password !== confirm)
      return setError("Passwords do not match.");
    await run(async () => {
      if (step === "details") return send();
      if (step === "code") {
        const result = await api("/password/verify", {
          challenge: challenge.challenge,
          verification_id: challenge.verification_id,
          code,
        });
        setChallenge((old) => ({ ...old, ...result }));
        setStep("password");
        return;
      }
      await api("/password/reset", {
        challenge: challenge.challenge,
        verification_id: challenge.verification_id,
        verification_token: challenge.verification_token,
        password,
        confirm_password: confirm,
      });
      setPassword("");
      setConfirm("");
      setChallenge(null);
      setCode("");
      setStep("done");
      onReset();
    });
  }
  return (
    <section className="mobile-account panel">
      <h1>{step === "done" ? "Password reset" : "Reset your password"}</h1>
      <p>
        {step === "details"
          ? "Enter your username and registered mobile number. We’ll send an SMS verification code."
          : step === "code"
            ? challenge.message
            : step === "password"
              ? "Mobile number verified. Choose a new password with at least 12 characters."
              : "Your password has been changed and previous sessions have been signed out."}
      </p>
      {step === "done" ? (
        <a className="primary mobile-account-submit" href="#login">
          Back to login
        </a>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            {step === "details" && (
              <>
                <label>
                  Username
                  <input
                    id="resetUsername"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={30}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </label>
                <div className="mobile-account-phone">
                  <label>
                    Country code
                    <select
                      value={country}
                      onChange={(e) => phoneChange(e.target.value, national)}
                    >
                      {CALLING_CODES.map((c) => (
                        <option key={c.country} value={c.country}>
                          {c.name} (+{c.dial})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Registered mobile number
                    <input
                      id="resetPhone"
                      type="tel"
                      autoComplete="tel-national"
                      required
                      value={national}
                      onChange={(e) => phoneChange(country, e.target.value)}
                    />
                  </label>
                </div>
              </>
            )}
            {step === "code" && (
              <section className="mobile-otp">
                <h2>Enter your SMS code</h2>
                <OTPInput
                  id="resetOTP"
                  label="Password reset code"
                  value={code}
                  onChange={setCode}
                  disabled={busy}
                />
                <button type="button" onClick={() => run(send)}>
                  Resend code
                </button>
                <button
                  type="button"
                  className="mobile-account-link"
                  onClick={() => {
                    setStep("details");
                    setChallenge(null);
                    setCode("");
                    setError("");
                  }}
                >
                  Change details
                </button>
              </section>
            )}
            {step === "password" && (
              <>
                <label>
                  New password
                  <input
                    id="resetPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    id="resetConfirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
              </>
            )}
            <p className="flow-error" role="alert">
              {error}
            </p>
            <button
              id="resetSubmit"
              className="primary mobile-account-submit"
              disabled={busy || (step === "code" && !/^\d{6}$/.test(code))}
            >
              {busy
                ? "Please wait…"
                : step === "details"
                  ? "Send reset OTP"
                  : step === "code"
                    ? "Verify code"
                    : "Save new password"}
            </button>
          </fieldset>
        </form>
      )}
      {step !== "done" && (
        <p>
          <a href="#login">Back to login</a>
        </p>
      )}
    </section>
  );
}
