import { useEffect, useState } from "react";
import { api, establishSession } from "./api.js";
import { OTPInput } from "./BookingControls.jsx";
import { CALLING_CODES, phoneInput } from "./phone-country.js";
import "./mobile-account.css";

export default function MobileAccount({ signup, account, onDone }) {
  const [setup, setSetup] = useState(!!account?.setup_required);
  const [form, setForm] = useState({
    username: "",
    name: account?.name || "",
    password: "",
    confirm: "",
    zip_code: "",
  });
  const [country, setCountry] = useState("US"),
    [national, setNational] = useState("");
  const [proof, setProof] = useState(null),
    [code, setCode] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (account?.setup_required) setSetup(true);
  }, [account?.setup_required]);
  const registration = signup || setup;
  const phone = phoneInput(country, national).phone;
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
      if (e.status === 403) {
        setProof(null);
        setCode("");
      }
    } finally {
      setBusy(false);
    }
  }
  function changePhone(nextCountry, value) {
    const parsed = phoneInput(nextCountry, value);
    setCountry(parsed.country);
    setNational(parsed.national);
    setProof(null);
    setCode("");
  }
  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    if (signup && !setup && form.password !== form.confirm)
      return setError("Passwords do not match.");
    await run(async () => {
      if (registration && !proof?.verification_token) {
        if (!proof) {
          const result = await api("/registration/mobile/code", { phone });
          setProof(result);
        } else {
          const result = await api("/registration/mobile/verify", {
            challenge: proof.challenge,
            verification_id: proof.verification_id,
            code,
          });
          setProof((old) => ({ ...old, ...result }));
        }
        return;
      }
      const result = await establishSession(
        setup ? "/account/setup" : signup ? "/register" : "/login",
        {
          username: form.username,
          password: form.password,
          ...(registration
            ? {
                name: form.name,
                phone,
                zip_code: form.zip_code,
                challenge: proof.challenge,
                verification_id: proof.verification_id,
                verification_token: proof.verification_token,
              }
            : {}),
        },
      );
      await onDone(result.member);
    });
  }
  return (
    <section className="mobile-account panel">
      <h1>
        {setup
          ? "Set up your existing account"
          : signup
            ? "Create an account"
            : "Welcome back"}
      </h1>
      <p>
        {setup
          ? "Keep your profile and requests. Choose a username and verify your mobile number using your existing password."
          : registration
            ? "Choose a username and verify your mobile number to request times with imaging centers."
            : "Log in with your username and password."}
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {signup && !setup && (
            <label>
              Full name
              <input
                id="accountName"
                autoComplete="name"
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => change("name", e.target.value)}
              />
            </label>
          )}
          <label>
            {setup ? "Choose your username" : "Username"}
            <input
              id="accountUsername"
              autoComplete={registration ? "off" : "username"}
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_][A-Za-z0-9_.\-]{2,29}"
              value={form.username}
              onChange={(e) => change("username", e.target.value)}
            />
          </label>
          <label>
            {setup ? "Existing password" : "Password"}
            <input
              id="accountPassword"
              type="password"
              autoComplete={
                signup && !setup ? "new-password" : "current-password"
              }
              required
              minLength={signup && !setup ? 12 : 1}
              maxLength={128}
              value={form.password}
              onChange={(e) => change("password", e.target.value)}
            />
          </label>
          {signup && !setup && (
            <label>
              Confirm password
              <input
                id="accountConfirm"
                type="password"
                autoComplete="new-password"
                required
                value={form.confirm}
                onChange={(e) => change("confirm", e.target.value)}
              />
            </label>
          )}
          {registration && (
            <>
              <div className="mobile-account-phone">
                <label>
                  Country code
                  <select
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
                <label>
                  Mobile number
                  <input
                    id="accountPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    required
                    value={national}
                    onChange={(e) => changePhone(country, e.target.value)}
                  />
                </label>
              </div>
              {signup && !setup && (
                <label>
                  ZIP code (optional)
                  <input
                    id="accountZip"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={5}
                    pattern="[0-9]{5}"
                    value={form.zip_code}
                    onChange={(e) =>
                      change(
                        "zip_code",
                        e.target.value.replace(/\D/g, "").slice(0, 5),
                      )
                    }
                  />
                </label>
              )}
              {proof && !proof.verification_token && (
                <section className="mobile-otp">
                  <h2>Verify your mobile number</h2>
                  <p>Enter the six-digit SMS code sent to {phone}.</p>
                  <OTPInput
                    id="registrationOTP"
                    label="Mobile verification code"
                    value={code}
                    onChange={setCode}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      run(async () => {
                        const result = await api("/registration/mobile/code", {
                          phone,
                        });
                        setProof(result);
                        setCode("");
                      })
                    }
                  >
                    Resend code
                  </button>
                </section>
              )}
              {proof?.verification_token && (
                <p className="flow-verified" role="status">
                  Mobile number verified. You can continue.
                </p>
              )}
            </>
          )}
          <p className="flow-error" role="alert">
            {error}
          </p>
          <button
            id="accountSubmit"
            className="primary mobile-account-submit"
            disabled={
              busy ||
              (registration &&
                proof &&
                !proof.verification_token &&
                !/^\d{6}$/.test(code))
            }
          >
            {busy
              ? "Please wait…"
              : registration && !proof?.verification_token
                ? proof
                  ? "Verify mobile number"
                  : "Send mobile OTP"
                : setup
                  ? "Save and continue"
                  : signup
                    ? "Create account"
                    : "Log in"}
          </button>
        </fieldset>
      </form>
      {!signup && !setup && (
        <p>
          <a className="mobile-account-link" href="#reset-password">
            Forgot password?
          </a>
        </p>
      )}
      {setup && !signup && (
        <p>
          <button
            type="button"
            className="mobile-account-link"
            onClick={() => {
              setSetup(false);
              setProof(null);
              setError("");
            }}
          >
            Back to login
          </button>
        </p>
      )}
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
      {setup && (
        <p className="flow-help">
          Use the mobile number already saved on your account. If it is missing
          or has changed, contact support to update it first.
        </p>
      )}
    </section>
  );
}
