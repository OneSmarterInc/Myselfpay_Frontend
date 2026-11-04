import { useState } from "react";
import { OTPInput } from "./BookingControls.jsx";
import "./center-portal.css";

import { centerAPI as call } from "./center-api.js";
export { default } from "./CenterWorkspace.jsx";

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
