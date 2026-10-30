import { cloneElement, useEffect, useId, useRef, useState } from "react";
import { api, establishSession, setCsrf } from "./api.js";
import { price, contrastLabel, safeWebsite, phoneOf } from "./format.js";
import Booking, { BookingLink } from "./Booking.jsx";

const defaults = {
  location: "",
  scope: "state",
  radius: 50,
  mod: "",
  body: "",
  contrast: "unknown",
  budget: "",
  type: "all",
  sort: "distance",
  selected: [],
};
export function Field({ label, children }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
export function Notice({ children }) {
  return <p className="notice">{children}</p>;
}
export function Contact({ entry }) {
  const phone = phoneOf(entry),
    website = safeWebsite(entry.source);
  return (
    <div className="actions">
      {phone && (
        <a className="button" href={"tel:+1" + phone.replaceAll("-", "")}>
          Call {phone}
        </a>
      )}
      {website && (
        <a
          className="button"
          href={website}
          target="_blank"
          rel="noopener noreferrer"
        >
          Facility website ↗
        </a>
      )}
    </div>
  );
}
export default function App() {
  const [member, setMember] = useState(null),
    [boot, setBoot] = useState(true),
    [error, setError] = useState("");
  const [route, setRoute] = useState(() => location.hash.slice(1) || "home");
  const [catalog, setCatalog] = useState({
      entries: [],
      offers: [],
      locations: [],
    }),
    [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState(defaults),
    [results, setResults] = useState(null),
    [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState([]),
    [booking, setBooking] = useState(null),
    [privateMode, setPrivate] = useState(false);
  const searchSequence = useRef(0);
  function navigate(value) {
    location.hash = value;
  }
  function clearSession() {
    searchSequence.current++;
    setCsrf("");
    setMember(null);
    setCatalog({ entries: [], offers: [], locations: [] });
    setResults(null);
    setChosen([]);
    setFilters(defaults);
    setBooking(null);
  }
  useEffect(() => {
    const expired = () => {
      clearSession();
      setError("Your session expired. Continue as guest or sign in again.");
    };
    window.addEventListener("selfpay:session-expired", expired);
    return () => window.removeEventListener("selfpay:session-expired", expired);
  }, []);
  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1) || "home");
      setError("");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    let active = true;
    api("/directory-summary")
      .then((value) => {
        if (active) setSummary(value);
      })
      .catch(() => {});
    api("/me")
      .then((value) => {
        if (active) setMember(value.member);
      })
      .catch((e) => {
        if (active && e.status !== 401) setError(e.message);
      })
      .finally(() => {
        if (active) setBoot(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!member) return;
    let active = true;
    api("/catalog")
      .then((value) => {
        if (active) setCatalog(value);
      })
      .catch((e) => {
        if (active && e.status !== 401) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [member]);
  async function run(action) {
    setError("");
    setBusy(true);
    try {
      return await action();
    } catch (e) {
      if (e.status !== 401) setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function guest(destination = "search") {
    await run(async () => {
      const value = await establishSession("/guest", {});
      setMember(value.member);
      navigate(destination);
    });
  }
  async function logout() {
    await run(async () => {
      try {
        await api("/logout", {});
      } catch (error) {
        if (error.status !== 401) throw error;
      }
      clearSession();
      setError("");
      navigate("home");
    });
  }
  async function search(event, override) {
    event?.preventDefault();
    const value = override || filters;
    if (!value.location.trim()) {
      setError("Enter a state, city or ZIP code.");
      return;
    }
    const seq = ++searchSequence.current;
    await run(async () => {
      const data = await api("/search", value);
      if (seq === searchSequence.current) {
        setResults(data);
        setFilters(data.search);
        navigate("search");
      }
    });
  }
  const selectedOffer = route.startsWith("facility/")
    ? [
        ...catalog.offers,
        ...(results?.offers || []),
        ...(results?.programs || []),
      ].find((o) => o.id === decodeURIComponent(route.slice(9)))
    : null;
  const isLink = route.startsWith("booking/") || route.startsWith("clinic/");
  return (
    <>
      <header>
        <a className="brand" href="#home">
          MySelf<span>Pay</span>
          <small>by One Smarter, Inc.</small>
        </a>
        <nav aria-label="Main navigation">
          <a
            href="#search"
            onClick={(e) => {
              if (!member) {
                e.preventDefault();
                void guest();
              }
            }}
          >
            Find imaging
          </a>
          <a
            href="#directory"
            onClick={(e) => {
              if (!member) {
                e.preventDefault();
                void guest("directory");
              }
            }}
          >
            Directory
          </a>
          {member && member.tenant !== "guest" && (
            <a href="#history">Saved history</a>
          )}
          {member ? (
            <>
              <a href="#preferences">Preferences</a>
              <button disabled={busy} onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <a className="button" href="#login">
              Log in
            </a>
          )}
        </nav>
      </header>
      <main>
        {error && (
          <div className="error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {boot ? (
          <p role="status">Loading your session…</p>
        ) : isLink ? (
          <BookingLink route={route} onError={setError} />
        ) : route === "login" || route === "signup" ? (
          <Auth
            signup={route === "signup"}
            onSuccess={(value) => {
              setMember(value.member);
              navigate("search");
            }}
            onGuest={guest}
          />
        ) : route === "home" ? (
          <>
            <section className="hero">
              <p className="eyebrow">YOUR EXAM. YOUR OPTIONS.</p>
              <h1>
                Know your options.
                <br />
                <em>Before you pay.</em>
              </h1>
              <p className="intro">
                Explore self-pay MRI and CT prices, compare imaging centers, and
                ask the right questions about your care.
              </p>
              <div className="actions">
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => (member ? navigate("search") : guest())}
                >
                  Find imaging near you →
                </button>
                <button
                  disabled={busy}
                  onClick={() => (member ? navigate("chat") : guest("chat"))}
                >
                  Try guided search
                </button>
              </div>
              {summary && (
                <p className="muted">
                  {summary.listing_count} researched listings ·{" "}
                  {summary.state_count} states represented
                </p>
              )}
            </section>
            <div className="three">
              <section className="panel">
                <span className="step">01</span>
                <h2>Tell us where</h2>
                <p>
                  Search by state, city or ZIP and the exam your clinician
                  ordered.
                </p>
              </section>
              <section className="panel">
                <span className="step">02</span>
                <h2>Compare the details</h2>
                <p>
                  See published prices, what is included, and what needs
                  confirmation.
                </p>
              </section>
              <section className="panel">
                <span className="step">03</span>
                <h2>Contact the center</h2>
                <p>
                  Confirm your exact exam, total price and appointment
                  availability.
                </p>
              </section>
            </div>
            <Notice>
              Published research is a starting point. Listings are not
              guaranteed quotes or medical recommendations. Confirm the ordered
              exam, eligibility and all-in price with the facility.
            </Notice>
          </>
        ) : [
            "about",
            "contact",
            "privacy",
            "terms",
            "for-imaging-centers",
          ].includes(route) ? (
          <Info route={route} />
        ) : !member ? (
          <section className="panel">
            <h1>Start your search</h1>
            <p>Browse as a guest, or log in to save account history.</p>
            <div className="actions">
              <button className="primary" onClick={() => guest(route)}>
                Continue as guest
              </button>
              <a href="#login">Log in</a>
            </div>
          </section>
        ) : selectedOffer ? (
          <Detail
            offer={selectedOffer}
            onBook={() =>
              setBooking({ entry: selectedOffer.entry, offer: selectedOffer })
            }
            member={member}
          />
        ) : route.startsWith("facility/") ? (
          <section className="panel">
            <h1>Listing unavailable</h1>
            <p>The listing may have changed.</p>
            <a href="#search">Back to search</a>
          </section>
        ) : route === "directory" ? (
          <Directory
            catalog={catalog}
            onBook={(entry) => setBooking({ entry })}
          />
        ) : route === "chat" ? (
          <Chat
            filters={filters}
            onResults={(value) => {
              setResults(value);
              setFilters(value.search);
            }}
            onOpen={(id) => navigate("facility/" + encodeURIComponent(id))}
            member={member}
          />
        ) : route === "history" ? (
          <History
            onRestore={(value) => {
              setFilters({ ...defaults, ...value.search });
              setResults(null);
              navigate("search");
            }}
          />
        ) : route === "preferences" ? (
          <Preferences
            privateMode={privateMode}
            setPrivate={setPrivate}
            filters={filters}
            onLoad={(value) => setFilters({ ...defaults, ...value })}
          />
        ) : route === "compare" ? (
          <Compare offers={chosen} />
        ) : [
            "about",
            "contact",
            "privacy",
            "terms",
            "for-imaging-centers",
          ].includes(route) ? (
          <Info route={route} />
        ) : (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">SELF-PAY IMAGING</p>
                <h1>Find your options</h1>
              </div>
              <a href="#chat">Prefer a conversation? Try guided search →</a>
            </div>
            <div className="search-layout">
              <aside>
                <SearchForm
                  filters={filters}
                  setFilters={setFilters}
                  locations={catalog.locations}
                  onSubmit={search}
                  busy={busy}
                />
                <label className="check">
                  <input
                    type="checkbox"
                    checked={privateMode}
                    onChange={(e) => setPrivate(e.target.checked)}
                  />
                  Private mode: do not save searches
                </label>
                {member.tenant !== "guest" && !privateMode && results && (
                  <button
                    onClick={() =>
                      run(() =>
                        api("/conversations", {
                          search: filters,
                          messages: [],
                          title: `${filters.mod || "Imaging"} in ${filters.location}`,
                        }),
                      )
                    }
                  >
                    Save search to history
                  </button>
                )}
              </aside>
              <section aria-live="polite">
                {busy && <p role="status">Searching…</p>}
                {results ? (
                  <>
                    <h2>
                      {results.results_heading ||
                        `${results.offers.length} published price options`}
                    </h2>
                    {results.location_notice && (
                      <Notice>{results.location_notice}</Notice>
                    )}
                    {results.location_suggestions?.length > 0 && (
                      <div className="actions">
                        {results.location_suggestions.map((label) => (
                          <button
                            key={label}
                            onClick={() =>
                              search(null, { ...filters, location: label })
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                    {results.offers.map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        chosen={chosen}
                        onChoose={() =>
                          setChosen((old) =>
                            old.some((x) => x.id === offer.id)
                              ? old.filter((x) => x.id !== offer.id)
                              : old.length < 3
                                ? [...old, offer]
                                : old,
                          )
                        }
                      />
                    ))}
                    {results.programs?.length > 0 && (
                      <h2>
                        {results.program_heading || "Programs and networks"}
                      </h2>
                    )}
                    {results.programs?.map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        chosen={chosen}
                        onChoose={() =>
                          setChosen((old) =>
                            old.some((x) => x.id === offer.id)
                              ? old.filter((x) => x.id !== offer.id)
                              : old.length < 3
                                ? [...old, offer]
                                : old,
                          )
                        }
                      />
                    ))}
                    {[
                      ...(results.nearby_unpriced || []),
                      ...(results.program_entries || []),
                    ].map((entry, index) => (
                      <EntryCard
                        key={entry.booking_id || index}
                        entry={entry}
                        onBook={() => setBooking({ entry })}
                      />
                    ))}
                    {!results.offers.length &&
                      !results.nearby_unpriced?.length &&
                      !results.programs?.length && (
                        <Notice>
                          No matching published price. Try broader filters or
                          browse the directory to request a quote.
                        </Notice>
                      )}
                  </>
                ) : (
                  <section className="empty">
                    <span className="search-mark">⌕</span>
                    <h2>Start with a location</h2>
                    <p>Your next step toward a clearer price.</p>
                    <button
                      onClick={() => {
                        const value = {
                          ...defaults,
                          location: "Cincinnati, OH",
                          mod: "MRI",
                          body: "knee",
                        };
                        setFilters(value);
                        void search(null, value);
                      }}
                    >
                      Try sample: knee MRI in Cincinnati
                    </button>
                  </section>
                )}
              </section>
            </div>
          </>
        )}
        {chosen.length > 0 && (
          <div className="compare-bar">
            <span>{chosen.length} of 3 selected</span>
            <a className="button primary" href="#compare">
              Compare options
            </a>
            <button onClick={() => setChosen([])}>Clear</button>
          </div>
        )}
      </main>
      <footer>
        <a className="brand" href="#home">
          MySelf<span>Pay</span>
        </a>
        <p>Clearer choices for self-pay imaging.</p>
        <div className="actions">
          {["about", "contact", "privacy", "for-imaging-centers"].map(
            (link) => (
              <a
                href={"/" + (link === "privacy" ? "privacy-terms" : link) + "/"}
                key={link}
              >
                {link.replaceAll("-", " ")}
              </a>
            ),
          )}
        </div>
        <p className="small">
          No payment, insurance calculation, external AI or clinical advice is
          provided. Appointment delivery is currently in testing mode.
        </p>
      </footer>
      {booking && (
        <div className="overlay">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-title"
          >
            <Booking
              entry={booking.entry}
              offer={booking.offer}
              onClose={() => setBooking(null)}
            />
          </section>
        </div>
      )}
    </>
  );
}
function Auth({ signup, onSuccess, onGuest }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (signup && data.password !== data.confirm) {
      setError("Passwords do not match.");
      return;
    }
    delete data.confirm;
    setBusy(true);
    try {
      await onSuccess(
        await establishSession(signup ? "/register" : "/login", data),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel narrow">
      <p className="eyebrow">WELCOME TO MYSELFPAY</p>
      <h1>{signup ? "Create your account" : "Welcome back"}</h1>
      <form onSubmit={submit}>
        {signup && (
          <Field label="Full name">
            <input name="name" required maxLength={100} autoComplete="name" />
          </Field>
        )}
        <Field label="Email address">
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="username"
          />
        </Field>
        {signup && (
          <Field label="Phone number (optional)">
            <input name="phone" type="tel" maxLength={30} autoComplete="tel" />
          </Field>
        )}
        <Field label="Password">
          <input
            name="password"
            type="password"
            required
            minLength={signup ? 12 : undefined}
            maxLength={128}
            autoComplete={signup ? "new-password" : "current-password"}
          />
        </Field>
        {signup && (
          <>
            <p className="small">Use 12–128 characters.</p>
            <Field label="Confirm password">
              <input
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
              />
            </Field>
            <p className="small">
              Your name, email, optional phone and password hash are stored.
              Appointment requests require separate email verification.
            </p>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
        </button>
      </form>
      <p>
        <a href={signup ? "#login" : "#signup"}>
          {signup ? "Already have an account? Log in" : "Create an account"}
        </a>
      </p>
      <button onClick={() => onGuest()}>Continue as guest</button>
      <p className="small">
        Password recovery is not available yet.{" "}
        <a href="mailto:partners@onesmarter.com">Contact support</a>.
      </p>
    </section>
  );
}
function SearchForm({ filters, setFilters, locations, onSubmit, busy }) {
  const update = (key, value) =>
    setFilters((old) => ({ ...old, [key]: value }));
  return (
    <form className="panel filters" onSubmit={onSubmit}>
      <h2>Your search</h2>
      <Field label="State, city or ZIP">
        <input
          required
          value={filters.location}
          onChange={(e) => update("location", e.target.value)}
          list="locations"
          placeholder="e.g. Cincinnati, OH"
          maxLength={120}
        />
      </Field>
      <datalist id="locations">
        {locations.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <Field label="Search area">
        <select
          value={filters.scope === "state" ? "state" : filters.radius}
          onChange={(e) => {
            update("scope", e.target.value === "state" ? "state" : "radius");
            if (e.target.value !== "state")
              update("radius", Number(e.target.value));
          }}
        >
          <option value="state">Entire state</option>
          {[25, 50, 100, 250].map((n) => (
            <option value={n} key={n}>
              {n} miles
            </option>
          ))}
        </select>
      </Field>
      <Field label="Imaging service">
        <select
          value={filters.mod}
          onChange={(e) => update("mod", e.target.value)}
        >
          <option value="">All imaging services</option>
          <option>MRI</option>
          <option>CT</option>
        </select>
      </Field>
      <Field label="Body part / ordered exam">
        <input
          value={filters.body}
          onChange={(e) => update("body", e.target.value)}
          placeholder="e.g. knee"
          maxLength={100}
        />
      </Field>
      <Field label="Contrast">
        <select
          value={filters.contrast}
          onChange={(e) => update("contrast", e.target.value)}
        >
          {["unknown", "without", "with", "both"].map((value) => (
            <option key={value} value={value}>
              {contrastLabel(value)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Budget in USD">
        <input
          type="number"
          min="0"
          max="1000000"
          value={filters.budget || ""}
          onChange={(e) => update("budget", e.target.value)}
        />
      </Field>
      <Field label="Price status">
        <select
          value={filters.type}
          onChange={(e) => update("type", e.target.value)}
        >
          {[
            "all",
            "fixed",
            "starting",
            "range",
            "maximum",
            "average",
            "quote",
            "conflict",
          ].map((value) => (
            <option value={value} key={value}>
              {value === "all" ? "All price types" : value}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Sort by">
        <select
          value={filters.sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="distance">Distance</option>
          <option value="price">Price</option>
          <option value="scope">Scope</option>
        </select>
      </Field>
      <button className="primary full" disabled={busy}>
        Search imaging
      </button>
    </form>
  );
}
function OfferCard({ offer, chosen, onChoose }) {
  const selected = chosen.some((x) => x.id === offer.id);
  return (
    <article className="card">
      <div className="card-top">
        <span className="badge">
          {offer.mod} · {offer.type}
        </span>
        <strong className="price">{price(offer)}</strong>
      </div>
      <h3>
        <a href={"#facility/" + encodeURIComponent(offer.id)}>
          {offer.entry.name}
        </a>
      </h3>
      <p>
        {offer.entry.area} · {contrastLabel(offer.contrast)}
      </p>
      <p>{offer.scope}</p>
      {Number.isFinite(offer.distance_miles) && (
        <p className="small">
          About {Math.round(offer.distance_miles)} straight-line miles away
        </p>
      )}
      {offer.budget_status && <p className="small">{offer.budget_status}</p>}
      <div className="actions">
        <a
          className="button"
          href={"#facility/" + encodeURIComponent(offer.id)}
        >
          View details
        </a>
        <button
          aria-pressed={selected}
          disabled={!selected && chosen.length >= 3}
          onClick={onChoose}
        >
          {selected ? "Remove comparison" : "Compare"}
        </button>
      </div>
    </article>
  );
}
function EntryCard({ entry, onBook }) {
  return (
    <article className="card">
      <span className="badge">Request a quote</span>
      <h3>{entry.name}</h3>
      <p>
        {entry.area} · {entry.states}
      </p>
      <p>{entry.coverage}</p>
      <Contact entry={entry} />
      {entry.booking_id && (
        <button onClick={onBook}>Request an appointment</button>
      )}
    </article>
  );
}
function Directory({ catalog, onBook }) {
  const [query, setQuery] = useState("");
  const entries = catalog.entries.filter((e) =>
    `${e.name} ${e.area} ${e.states}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <p className="eyebrow">RESEARCHED LISTINGS</p>
      <h1>Imaging directory</h1>
      <Field label="Filter directory">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Center, city or state"
        />
      </Field>
      <p>
        {entries.length} entries · Published research, subject to confirmation.
      </p>
      <div className="two">
        {entries.map((entry) => (
          <EntryCard
            key={entry.booking_id}
            entry={entry}
            onBook={() => onBook(entry)}
          />
        ))}
      </div>
    </>
  );
}
function Detail({ offer, onBook, member }) {
  const [report, setReport] = useState(""),
    [message, setMessage] = useState("");
  async function correction(e) {
    e.preventDefault();
    try {
      await api("/corrections", {
        offer_id: offer.id,
        description: report,
        category: "Listing correction",
      });
      setMessage("Report submitted for review.");
      setReport("");
    } catch (e) {
      setMessage(e.message);
    }
  }
  return (
    <>
      <a href="#search">← Back to search</a>
      <div className="detail-layout">
        <section className="panel">
          <span className="badge">
            {offer.mod} · {offer.type}
          </span>
          <h1>{offer.entry.name}</h1>
          <p>{offer.entry.area}</p>
          <p className="price large">{price(offer)}</p>
          <p>
            {contrastLabel(offer.contrast)} · {offer.scope}
          </p>
          <Notice>
            Confirm the exact exam, eligibility and all-in price. Published
            prices do not guarantee availability.
          </Notice>
          <h2>What is included</h2>
          <p>{offer.included || "Confirm with the facility."}</p>
          <h2>Requirements</h2>
          <p>{offer.order || "Ask whether a referral or order is required."}</p>
          <h2>Restrictions and notes</h2>
          <p>{offer.entry.notes}</p>
          <h2>Questions to ask</h2>
          <ul>
            <li>
              Does this price include the radiologist, facility, contrast and
              supplies?
            </li>
            <li>Are the report and images included?</li>
            <li>Can I use the self-pay price if I have insurance?</li>
            <li>What are the cancellation and refund terms?</li>
          </ul>
        </section>
        <aside className="panel">
          <h2>Contact this facility</h2>
          <p>{offer.entry.coverage}</p>
          <Contact entry={offer.entry} />
          <button className="primary" onClick={onBook}>
            Request an appointment
          </button>
          <p className="small">
            Source checked: {String(offer.entry.checked || "").slice(0, 10)}
          </p>
          {member.tenant !== "guest" && (
            <form onSubmit={correction}>
              <h3>Report a listing issue</h3>
              <Field label="Describe the correction">
                <textarea
                  required
                  maxLength={1000}
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                />
              </Field>
              <button>Submit report</button>
              <p role="status">{message}</p>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}
function Compare({ offers }) {
  return (
    <>
      <a href="#search">← Back to search</a>
      <h1>Compare your options</h1>
      {!offers.length ? (
        <p>Select up to three options in search results.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Details</th>
                {offers.map((o) => (
                  <th key={o.id}>{o.entry.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Published price", price],
                ["Price status", (o) => o.type],
                ["Exam", (o) => o.mod + " · " + contrastLabel(o.contrast)],
                ["Scope", (o) => o.scope],
                ["Included", (o) => o.included],
                ["Requirements", (o) => o.order],
                ["Source checked", (o) => String(o.entry.checked).slice(0, 10)],
              ].map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  {offers.map((o) => (
                    <td key={o.id}>{value(o)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Notice>
        Compare the same exam and contrast. Published prices are not current
        quotes.
      </Notice>
    </>
  );
}
function Chat({ filters, onResults, onOpen, member }) {
  const [messages, setMessages] = useState([]),
    [text, setText] = useState(""),
    [conversation, setConversation] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    const value = text;
    try {
      const result = await api("/agent", {
        message: value,
        search: filters,
        conversation_id: conversation,
      });
      setMessages((old) => [
        ...old,
        { role: "user", text: value },
        { role: "assistant", text: result.reply, offers: result.offers },
      ]);
      setConversation(result.conversation_id);
      onResults(result);
      setText("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel chat">
      <p className="eyebrow">GUIDED SEARCH</p>
      <h1>What are you looking for?</h1>
      <p>
        This deterministic search helper uses the directory. No external AI or
        microphone is connected.
      </p>
      {member.tenant === "guest" && (
        <Notice>
          Guest preview: 3 conversations, 5 messages each, 500 characters per
          message. Chat text is not stored.
        </Notice>
      )}
      <div role="log" aria-live="polite">
        {messages.map((m, index) => (
          <div className={"bubble " + m.role} key={index}>
            <strong>{m.role === "user" ? "You" : "MySelfPay"}</strong>
            <p>{m.text}</p>
            {m.offers?.slice(0, 3).map((o) => (
              <button key={o.id} onClick={() => onOpen(o.id)}>
                {o.entry.name} · {price(o)}
              </button>
            ))}
          </div>
        ))}
      </div>
      <form onSubmit={send}>
        <Field label="Your message">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            maxLength={member.tenant === "guest" ? 500 : 2000}
            placeholder="Find a self-pay knee MRI near Cincinnati under $500"
          />
        </Field>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button className="primary" disabled={busy}>
            {busy ? "Searching…" : "Send message"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setConversation(null);
            }}
          >
            New conversation
          </button>
        </div>
      </form>
    </section>
  );
}
function History({ onRestore }) {
  const [items, setItems] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    api("/conversations")
      .then((v) => setItems(v.conversations))
      .catch((e) => setError(e.message));
  }, []);
  async function remove(id) {
    try {
      await api(
        "/conversations/" + encodeURIComponent(id),
        undefined,
        "DELETE",
      );
      setItems((old) => old.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <h1>Saved history</h1>
      {error && <p role="alert">{error}</p>}
      {!items.length && <p>No saved conversations or searches.</p>}
      {items.map((item) => (
        <article className="card" key={item.id}>
          <h2>{item.title}</h2>
          <div className="actions">
            <button onClick={() => onRestore(item)}>Restore search</button>
            <button onClick={() => remove(item.id)}>Delete</button>
          </div>
        </article>
      ))}
    </>
  );
}
function Preferences({ privateMode, setPrivate, filters, onLoad }) {
  const [message, setMessage] = useState("");
  async function action(kind) {
    try {
      if (kind === "save")
        await api("/preferences", { location: filters.location });
      if (kind === "delete") await api("/preferences", undefined, "DELETE");
      if (kind === "load") onLoad(await api("/preferences"));
      setMessage(
        kind === "load"
          ? "Location loaded into search."
          : kind === "save"
            ? "Location saved."
            : "Saved location deleted.",
      );
    } catch (e) {
      setMessage(e.message);
    }
  }
  return (
    <section className="panel narrow">
      <h1>Preferences</h1>
      <label className="check">
        <input
          type="checkbox"
          checked={privateMode}
          onChange={(e) => setPrivate(e.target.checked)}
        />
        Private mode: do not save searches or preferences
      </label>
      <p>
        Only a listed location preference is stored. Chat content is not
        included.
      </p>
      <p>Current search location: {filters.location || "None"}</p>
      <div className="actions">
        <button
          disabled={privateMode || !filters.location}
          onClick={() => action("save")}
        >
          Save location
        </button>
        <button onClick={() => action("load")}>Load saved location</button>
        <button onClick={() => action("delete")}>Delete saved location</button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
function Info({ route }) {
  const pages = {
    about: [
      "About MySelfPay",
      "MySelfPay by One Smarter, Inc. helps people research published self-pay MRI and CT options. Coverage is limited and listings require confirmation. We do not provide medical advice, insurance calculations or payment services.",
    ],
    contact: [
      "Contact us",
      "For support and listing corrections, contact partners@onesmarter.com. Do not email medical records or sensitive health information.",
    ],
    privacy: [
      "Privacy and terms",
      "Account registration stores your name, email, optional phone and a password hash. Sessions expire after eight hours. Guest search chat text is not stored; limited usage metadata and listed location preferences may be retained. Explicit appointment requests store encrypted contact and request details. Published prices and availability must be confirmed with the facility. No payment processing or clinical advice is provided.",
    ],
    terms: [
      "Terms of use",
      "Research listings are not guaranteed quotes, a contracted provider network or medical recommendations. Ask your clinician which test you need and confirm all-in pricing directly with the facility.",
    ],
    "for-imaging-centers": [
      "For imaging centers",
      "Contact partners@onesmarter.com to discuss your listing, verified pricing and appointment workflows. Clinic notification delivery is currently disabled during testing.",
    ],
  };
  return (
    <section className="panel narrow">
      <h1>{pages[route][0]}</h1>
      <p>{pages[route][1]}</p>
      <a href="mailto:partners@onesmarter.com">partners@onesmarter.com</a>
    </section>
  );
}
