import { useEffect, useState } from "react";
import { OTPInput } from "./BookingControls.jsx";
import "./center-portal.css";

import { centerAPI as call } from "./center-api.js";
export { default } from "./CenterWorkspace.jsx";

export const CENTER_FAQ = [
  ["How do requests arrive?", "Each request arrives by secure email at the address we have on file for your center, or at your request inbox if you set one. The email links to the request."],
  ["How do I respond to a request?", "Open the request, choose one of the patient's time windows or enter another time, or tell us you can't schedule this exam. The patient sees your answer on their request page."],
  ["How do I update my prices?", "Sign in to the center dashboard, open Prices, enter the exam price and confirm it. Patients see it on your listing."],
  ["What if the email on file is wrong?", "Choose Find your listing on the login page, or write to partners@onesmarter.com and we verify by phone."],
];

export function CenterFaq() {
  return (
    <section className="center-faq" aria-label="Center FAQ">
      <h2 id="dialogTitle">Center FAQ</h2>
      {CENTER_FAQ.map(([question, answer]) => (
        <div key={question}>
          <h3>{question}</h3>
          <p>{answer}</p>
        </div>
      ))}
    </section>
  );
}

export function CenterLogin({ onDone }) {
  const [email, setEmail] = useState(""),
    [challenge, setChallenge] = useState(""),
    [mode, setMode] = useState(() =>
      new URLSearchParams(location.search).get("find") ? "find" : "email",
    ),
    [query, setQuery] = useState(""),
    [matches, setMatches] = useState(null),
    [listing, setListing] = useState(null),
    [sentTo, setSentTo] = useState(""),
    [noEmail, setNoEmail] = useState(false);
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
  async function search(event) {
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);
    setError("");
    setMatches(null);
    try {
      const value = await call("find", { query });
      setMatches(value.matches || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function choose(match) {
    setBusy(true);
    setError("");
    setNoEmail(false);
    try {
      const value = await call("listing-code", { listing: match.id });
      setListing(match);
      if (value.no_email) {
        setNoEmail(true);
        return;
      }
      setSentTo(value.sent_to || "");
      setChallenge(value.verification_id);
      setMinutes(Math.max(1, Math.round((value.expires_in || 600) / 60)));
      setCode("");
      setWait(30);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function backToEmail() {
    setMode("email");
    setChallenge("");
    setCode("");
    setError("");
    setWait(0);
    setMatches(null);
    setListing(null);
    setSentTo("");
    setNoEmail(false);
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
  const finding = mode === "find" && !challenge;
  const viaListing = mode === "find" && !!challenge;
  return (
    <section className="center-login">
      <p className="eyebrow">FOR IMAGING CENTERS</p>
      <h2 id="dialogTitle">{finding ? "Find your listing" : "Center login"}</h2>
      <p className="center-help"><a href="#center-pro/sign-in">Assigned owner or staff? Sign in with a secure email link</a></p>
      {finding ? (
        <>
          <p>
            Search by your facility name or phone number. We send the code to
            the email we have on file for your center.
          </p>
          <form onSubmit={search}>
            <label htmlFor="centerFind">Facility name or phone</label>
            <input
              id="centerFind"
              maxLength={80}
              required
              value={query}
              disabled={busy}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="primary" disabled={busy || query.trim().length < 3}>
              {busy ? "Please wait…" : "Find my listing"}
            </button>
          </form>
          {matches && matches.length === 0 && (
            <p role="status">
              We found no listing for that search. Try another spelling or the
              facility phone number, or{" "}
              <a href="mailto:partners@onesmarter.com?subject=Find%20our%20MySelfPay%20listing">
                tell us
              </a>
              .
            </p>
          )}
          {matches && matches.length > 0 && (
            <ul className="center-matches">
              {matches.map((match) => (
                <li key={match.id}>
                  <span>
                    <strong>{match.name}</strong>
                    <small>
                      {[match.area, match.states]
                        .filter((x, i, all) => x && all.indexOf(x) === i)
                        .join(", ")}
                    </small>
                  </span>
                  <button type="button" disabled={busy} onClick={() => choose(match)}>
                    Send me a code
                  </button>
                </li>
              ))}
            </ul>
          )}
          {noEmail && (
            <p role="status">
              We don’t have an email on file for {listing?.name}. Tell us at{" "}
              <a href="mailto:partners@onesmarter.com?subject=Verify%20our%20MySelfPay%20listing">
                partners@onesmarter.com
              </a>{" "}
              and we’ll verify by phone.
            </p>
          )}
        </>
      ) : (
        <>
          {!viaListing && (
            <p>
              Enter the email we have on file for your center. We send it a
              6-digit code.
            </p>
          )}
          <form onSubmit={submit}>
            {!viaListing && (
              <>
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
              </>
            )}
            {challenge && (
              <>
                <p role="status">
                  {viaListing
                    ? `We sent a 6-digit code to ${sentTo || "the email on file"} for ${listing?.name}.`
                    : `If ${email} matches a listing, we sent a 6-digit code.`}{" "}
                  It may take a minute, and it can land in spam. The code works
                  for {minutes} {minutes === 1 ? "minute" : "minutes"}.
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
            {error && !finding && (
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
        </>
      )}
      {finding && error && (
        <p className="center-error" role="alert">
          {error}
        </p>
      )}
      {challenge ? (
        <div className="actions center-login-links">
          <button
            type="button"
            className="link-button"
            disabled={busy || wait > 0}
            onClick={viaListing ? () => choose(listing) : resend}
          >
            {wait > 0 ? `Send a new code (${wait}s)` : "Send a new code"}
          </button>
          <button
            type="button"
            className="link-button"
            disabled={busy}
            onClick={viaListing ? () => { setChallenge(""); setCode(""); setError(""); setWait(0); } : backToEmail}
          >
            {viaListing ? "Choose a different listing" : "Use a different email"}
          </button>
        </div>
      ) : finding ? (
        <p className="small muted">
          <button type="button" className="link-button" onClick={backToEmail}>
            Back to email login
          </button>
        </p>
      ) : (
        <p className="small muted">
          Not sure which email we have?{" "}
          <button type="button" className="link-button" onClick={() => { setMode("find"); setError(""); }}>
            Find your listing
          </button>{" "}
          or{" "}
          <a href="mailto:partners@onesmarter.com?subject=Which%20email%20do%20you%20have%20for%20our%20center">
            tell us
          </a>
          .
        </p>
      )}
      <details className="center-login-faq">
        <summary>Center FAQ</summary>
        {CENTER_FAQ.map(([question, answer]) => (
          <div key={question}>
            <h3>{question}</h3>
            <p>{answer}</p>
          </div>
        ))}
      </details>
    </section>
  );
}
