import { useRef, useState } from "react";

export function AppIcon({ name, ...props }) {
  const paths = {
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    chat: (
      <>
        <path d="M20 11.5a8 8 0 0 1-8 8H5l-4 3v-11a9.5 9.5 0 0 1 19 0Z" />
        <path d="M6 10h9M6 14h6" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
export function NativeAppHeader({
  account,
  view,
  busy,
  onSearch,
  onHome,
  onDirectory,
  onSignOut,
}) {
  const drawer = useRef(null),
    [open, setOpen] = useState(false);
  const member = account && account.tenant !== "guest";
  const close = () => {
    drawer.current?.close();
    setOpen(false);
  };
  const title =
    view === "home"
      ? "MySelfPay"
      : view === "dashboard"
        ? "My requests"
        : view === "login"
          ? "Log in"
          : view === "signup"
            ? "Create account"
            : view.startsWith("facility/")
              ? "Imaging center"
              : view.startsWith("clinic/")
                ? "For imaging centers"
                : view.startsWith("request/")
                  ? "MySelfPay"
                  : "Find imaging options";
  return (
    <>
      <header className="native-app-header">
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="nativeAppDrawer"
          onClick={() => {
            drawer.current.showModal();
            setOpen(true);
          }}
        >
          <AppIcon name="menu" />
        </button>
        <span className="native-app-title">{title}</span>
        <button
          type="button"
          aria-label="Search imaging centers"
          disabled={busy}
          onClick={onSearch}
        >
          <AppIcon name="search" />
        </button>
      </header>
      <dialog
        ref={drawer}
        id="nativeAppDrawer"
        className="native-app-drawer"
        aria-label="App navigation"
        onClose={() => setOpen(false)}
      >
        <div className="native-drawer-top">
          <strong>MySelfPay</strong>
          <button
            type="button"
            id="nativeCloseMenu"
            aria-label="Close navigation"
            onClick={close}
          >
            <AppIcon name="close" />
          </button>
        </div>
        <nav aria-label="Main navigation">
          <button
            type="button"
            onClick={() => {
              close();
              onHome();
            }}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              onSearch();
            }}
          >
            Find imaging options
          </button>
          {account && (
            <button
              type="button"
              onClick={() => {
                close();
                onDirectory();
              }}
            >
              Directory
            </button>
          )}
          {member ? (
            <a href="#dashboard" onClick={close}>
              Dashboard
            </a>
          ) : (
            <>
              <a href="#login" onClick={close}>
                Log in
              </a>
              <a href="#signup" onClick={close}>
                Create account
              </a>
            </>
          )}
          {account && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                close();
                onSignOut();
              }}
            >
              Sign out
            </button>
          )}
          <div className="native-menu-divider" />
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/privacy-terms">Terms &amp; Privacy</a>
          <a href="/for-imaging-centers">For imaging centers</a>
        </nav>
      </dialog>
    </>
  );
}
export function NativeWelcome({ onStart, busy, member }) {
  return (
    <section className="native-home">
      <div className="native-home-content">
        <div className="native-home-brand">
          <span>
            <img src="/logo.png" alt="" width="48" height="48" />
          </span>
          <strong>YOUR SELF-PAY SEARCH</strong>
        </div>
        <h1>
          Imaging options.
          <br />
          Clearer prices.
        </h1>
        <p className="native-home-subtitle">
          Find self-pay MRI and CT near you.
        </p>
        <div className="native-service-tiles">
          <button type="button" disabled={busy} onClick={() => onStart("MRI")}>
            <strong>MRI</strong>
            <span>Magnetic resonance</span>
          </button>
          <button type="button" disabled={busy} onClick={() => onStart("CT")}>
            <strong>CT</strong>
            <span>CT imaging</span>
          </button>
        </div>
        <p className="native-home-steps">Search nearby · Compare · Contact</p>
      </div>
      <div className="native-home-bottom">
        <button
          className="native-guest-action"
          type="button"
          disabled={busy}
          onClick={() => onStart("")}
        >
          {busy
            ? "Please wait…"
            : member
              ? "Find imaging options"
              : "Sign in as guest"}
        </button>
        <p>No account needed</p>
        <small>Confirm the exact exam and total with the facility.</small>
      </div>
    </section>
  );
}
