import { useEffect, useState } from "react";
import { OTPInput } from "./BookingControls.jsx";
import "./center-portal.css";

import { centerAPI as call } from "./center-api.js";
export { default } from "./CenterWorkspace.jsx";

export function CenterLogin({ onDone }) {
  const [email, setEmail] = useState(""),
    [challenge, setChallenge] = useState("");
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [minutes, setMinutes] = useState(10),
    [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  async function sendCode() {
    const value = await call("code", { email });
    setChallenge(value.verification_id);
    setMinutes(Math.max(1, Math.round((value.expires_in || 600) / 60)));
    setCode("");
    setWait(30);
  }
  async function resend() {
    setBusy(true);
    setError("");
    try {
      await sendCode();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
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
        await sendCode();
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
        Enter the email we have on file for your center. We send it a 6-digit
        code.
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
              If {email} matches a listing, we sent a 6-digit code. It may take
              a minute, and it can land in spam. The code works for {minutes}{" "}
              {minutes === 1 ? "minute" : "minutes"}.
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
              ? "Verify and open inbox"
              : "Email me a code"}
        </button>
      </form>
      {challenge ? (
        <div className="actions center-login-links">
          <button
            type="button"
            className="link-button"
            disabled={busy || wait > 0}
            onClick={resend}
          >
            {wait > 0 ? `Send a new code (${wait}s)` : "Send a new code"}
          </button>
          <button
            type="button"
            className="link-button"
            disabled={busy}
            onClick={() => {
              setChallenge("");
              setCode("");
              setError("");
              setWait(0);
            }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <p className="small muted">
          Not sure which email we have?{" "}
          <a href="mailto:partners@onesmarter.com?subject=Find%20our%20MySelfPay%20listing">
            Find your listing
          </a>{" "}
          or{" "}
          <a href="mailto:partners@onesmarter.com?subject=Which%20email%20do%20you%20have%20for%20our%20center">
            tell us
          </a>
          .
        </p>
      )}
    </section>
  );
}
