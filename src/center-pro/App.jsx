import PreviousScans from "./PreviousScans.jsx";
import NearbyCompanies from "./NearbyCompanies.jsx";
import CenterWorkspace from "../CenterWorkspace.jsx";
import { CenterFaq } from "../CenterPortal.jsx";
import './styles.css';
import Icon from "./Icon.jsx";
import { activityLabel, activityCategory } from "./activity.js";
import { useEffect, useState } from "react";
import { api } from "./api.js";
import { useResource } from "./useResource.js";
import { Alert, Drawer, Pagination, WorkspaceSections, dateTime } from "./components.jsx";
import Requests from "./Requests.jsx";
import Dashboard from "./Dashboard.jsx";
import RequestDetails from "./RequestDetails.jsx";
import OwnerPages from "./OwnerPages.jsx";
import {
  SignIn,
  VerifyLink,
  AdminLogin,
  AdminPages,
  Scheduling,
  PatientPage,
  Estimates,
  OwnerExtras,
} from "./CompletePages.jsx";

const readRoute = () => {
 const hash=location.hash;
 if(hash==="#center-login" || (!hash && location.pathname.replace(/\/+$/, "")==="/center-login"))return "sign-in";
 if(hash==='#center')sessionStorage.setItem('center-pro-mode','center');
 if(hash==='#center-pro/admin-overview'){sessionStorage.setItem('center-pro-mode','admin');return 'overview';}
 return hash.replace(/^#center-pro\/?/, '').replace(/^#center$/, '')||'overview';
};
export default function App() {
  const [session, setSession] = useState(null),
    [centerId, setCenterId] = useState(
      () => sessionStorage.getItem("pro-center") || "",
    ),
    [route, setRoute] = useState(readRoute),
    [menu, setMenu] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const center = session?.centers.find((c) => String(c.id) === centerId);
  const isPublic = /^(patient|referral)\//.test(route);
  const admin = session?.user?.is_admin;
  function chooseCenter(id) {
    setCenterId(String(id));
    sessionStorage.setItem("pro-center", String(id));
  }
  function navigate(path) {
    location.hash = "center-pro/" + path;
    setRoute(path==='admin-overview'?'overview':path);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(() => {
    if (route === "market" && center?.role === "owner") navigate("overview");
  }, [route, center?.role]);
  async function loadSession() {
    setError("");
    try {
      setSession(await api("/session"));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    loadSession();
  }, []);
  useEffect(() => {
    const update = () => {
      setRoute(readRoute());
      setMenu(false);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    const expired = () => {
      chooseCenter("");
      setMenu(false);
      loadSession();
    };
    window.addEventListener("pro-session-expired", expired);
    return () => window.removeEventListener("pro-session-expired", expired);
  }, []);
  async function devLogin(role) {
    setBusy(true);
    setError("");
    try {
      const value = await api("/development-login", {
        method: "POST",
        body: { role },
      });
      setSession(value);
      chooseCenter("");
      navigate("overview");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function switchWorkspace(mode) {
    sessionStorage.setItem('center-pro-mode',mode);chooseCenter('');setMenu(false);setSession(null);
    navigate(mode==='admin'?'admin-overview':'overview');await loadSession();
  }
  async function signOut() {
    setBusy(true);
    try {
      await api("/logout", { method: "POST" });
      chooseCenter("");
      setMenu(false);
      await loadSession();
      navigate("overview");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (session?.user && !session.user.is_admin && session.centers.length === 1 && !center) {
      chooseCenter(session.centers[0].id);
      if (!isPublic) navigate("overview");
    }
  }, [session, center, isPublic]);
  const authed = session?.user;
  const showMenu = (center || admin) && !isPublic;
  const returnToSession = (value) => {
    setSession(value);
    chooseCenter("");
  };
  return (
    <div className={"center-pro-root" + (showMenu ? " workspace-layout" : "") + (/^request\/\d+$/.test(route) ? " appointment-layout" : "")}>
      <header className="site-header">
        <div className="header-brand">
          {showMenu && (
            <button
              className="menu-button"
              aria-label="Open navigation"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Menu</span>
            </button>
          )}
          <a className="brand" href="#center-pro/overview">
            <img src="/logo.png" alt="" />
            <span>
              <b>
                MySelf<span>Pay</span>
              </b>
              <small>{showMenu ? "CENTER WORKSPACE" : "by One Smarter, Inc."}</small>
            </span>
          </a>
        </div>
        <div className="header-actions">
          {center && !isPublic ? <span className="navbar-center-name" title={`${center.name} - ${center.role} - ${center.timezone}`}>{center.name}</span> : <a href={admin ? "/admin/" : "#search"} className="text-button">{admin ? "Back to admin" : "Find imaging"}</a>}{admin && session.centers.length>0 && <button onClick={()=>switchWorkspace('center')}>Center workspace</button>}
          {!admin && session?.can_admin && <button onClick={()=>switchWorkspace('admin')}>Admin workspace</button>}
          {authed && !isPublic && (
            <button className="icon-button" disabled={busy} onClick={signOut} aria-label="Sign out" title="Sign out">
              <Icon name="signout" />
            </button>
          )}
        </div>
      </header>
      {showMenu && (
        <Drawer
          open={menu}
          onClose={() => setMenu(false)}
          onNavigate={navigate}
          route={
            route === "rescue" || route.startsWith("request/") || route.startsWith("estimate/")
              ? "requests"
              : ({schedule: "requests", "working-hours": "availability", referrals: "outreach", digest: "overview"}[route] || (route.startsWith("admin-access/") ? "admin-centers" : route))
          }
          role={admin ? "admin" : center.role}
        />
      )}
      <main className="shell">
        {error && (
          <Alert error>
            {error}
            <button onClick={loadSession}><Icon name="refresh" /> Retry connection</button>
          </Alert>
        )}
        {isPublic ? (
          <PatientPage key={route} route={route} />
        ) : !session ? (
          !error && <p role="status">Loading workspace…</p>
        ) : route.startsWith("verify/") ? (
          <VerifyLink
            token={route.split("/")[1]}
            onSession={returnToSession}
            navigate={navigate}
          />
        ) : !authed && session.center_verified ? (
          <section className="panel auth"><h1>Center access needs an assignment</h1><p>Your center email is verified. Ask your MySelfPay administrator to assign owner or staff access in Center workspace.</p><a className="button-link" href="#center-legacy">Open existing listing and inbox settings</a></section>
        ) : !authed ? (
          <SignIn
            session={session}
            onSession={returnToSession}
            devLogin={devLogin}
            busy={busy}
            navigate={navigate}
          />
        ) : admin ? (
          route === "overview" ? (
            <AdminOverview navigate={navigate} />
          ) : (
            <AdminPages
              key={route}
              route={route.startsWith("admin-") ? route : "admin-centers"}
              navigate={navigate}
            />
          )
        ) : !center ? (
          <section className="panel auth">
            <h1>Select your center</h1>
            <p>Choose a center to continue.</p>
            {!session.centers.length ? (
              <Alert>
                Your email is verified, but no center role has been assigned. Ask your MySelfPay administrator to assign owner or staff access.
              </Alert>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const id = new FormData(e.currentTarget).get("center");
                  chooseCenter(id);
                  navigate("overview");
                }}
              >
                <label className="field">
                  Center
                  <select required name="center" defaultValue="">
                    <option disabled value="">
                      Choose a center
                    </option>
                    {session.centers.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name} · {c.role}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary">Open workspace</button>
              </form>
            )}
          </section>
        ) : (
          <>
            {session.centers.length > 1 && <div className="workspace-bar">
              {session.centers.length > 1 && (
              <button
                onClick={() => {
                  if (session.centers.length === 2) {
                    const next = session.centers.find(c => String(c.id) !== centerId);
                    chooseCenter(next.id);
                    // Detail IDs and role-specific screens belong to the current workspace.
                    if (route.includes("/") || next.role !== center.role) navigate("overview");
                    else window.scrollTo({ top: 0, behavior: "instant" });
                  } else {
                    chooseCenter("");
                  }
                  setMenu(false);
                }}
              >
                <Icon name="switch" /> Switch center
              </button>
              )}
            </div>}
            <WorkspaceSections route={route} role={center.role} />
            <div key={center.id + ":" + route}>
              {route === "previous-scans" ? <PreviousScans center={center} /> : route === "nearby-companies" ? <NearbyCompanies center={center} /> : center.role === "owner" && ["inbox", "self-pay-prices", "profiles"].includes(route) ? (
                <CenterWorkspace embedded initialTab={{inbox:"open","self-pay-prices":"prices",profiles:"profile"}[route]} onLogin={()=>navigate("sign-in")} />
              ) : route === "help" ? (
                <section className="panel"><CenterFaq /><a href="/contact">Contact MySelfPay</a></section>
              ) : route === "overview" ? (
                <Overview center={center} navigate={navigate} />
              ) : route === "requests" || route === "schedule" ? (
                <Requests
                  center={center}
                  navigate={navigate}
                  initialStatus={route === "schedule" ? "confirmed" : ""}
                />
              ) : /^request\/\d+$/.test(route) ? (
                <RequestDetails
                  center={center}
                  id={route.split("/")[1]}
                  navigate={navigate}
                />
              ) : /^(pricing|outreach)(\/\d+)?$/.test(route) ? (
                <OwnerPages center={center} route={route} navigate={navigate} />
              ) : route === "audit" ? (
                <Audit center={center} />
              ) : ["working-hours", "availability"].includes(route) ? (
                <Scheduling center={center} route={route} navigate={navigate} />
              ) : route === "rescue" ? (
                <Requests center={center} navigate={navigate} />
              ) : /^estimate\/\d+$/.test(route) ? (
                <Estimates
                  center={center}
                  bookingId={route.split("/")[1]}
                  navigate={navigate}
                />
              ) : ["subscription", "referrals", "digest"].includes(
                  route,
                ) ? (
                <OwnerExtras center={center} route={route} />
              ) : (
                <section className="panel">
                  <h1>Page not found</h1>
                  <button onClick={() => navigate("overview")}>
                    <Icon name="back" /> Back to overview
                  </button>
                </section>
              )}
            </div>
          </>
        )}
      </main>
      <footer className="site-footer">
        <div className="footer-brand">
          <img src="/logo.png" alt="" width="28" height="28" />
          <span>MySelfPay by One Smarter, Inc. &middot; Dayton, Ohio</span>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#faq">FAQ</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/for-imaging-centers">For imaging centers</a>
          <a href="/center-login">Center login</a>
          <a href="/privacy-terms">Terms &amp; Privacy</a>
        </nav>
      </footer>
    </div>
  );
}

function Overview({ center, navigate }) {
  return <Dashboard center={center} navigate={navigate} />;
}
function Audit({ center }) {
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const { data, error, loading } = useResource(
    `/centers/${center.id}/audit?page=${page}`, refresh,
  );
  return (
    <>
      <div className="page-heading audit-heading">
        <div><h1>Activity log</h1>
        <p>Center changes, newest first. Times in {center.timezone}.</p></div>
        <button disabled={loading} onClick={() => setRefresh(n => n + 1)}><Icon name="refresh" /> Refresh activity</button>
      </div>
      <section className="panel data-panel audit-panel">
        {loading ? (
          <div className="table-state" role="status">Loading activity…</div>
        ) : error ? (
          <Alert error>{error}</Alert>
        ) : data && !data.count ? (
          <div className="table-state">
            No activity yet.
          </div>
        ) : (
          data && (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Reference</th>
                    <th>Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((r) => (
                    <tr key={r.id}>
                      <td data-label="Time">
                        {dateTime(r.created_at, center.timezone)}
                      </td>
                      <td data-label="Reference">{r.reference}</td>
                      <td data-label="Activity">
                        <strong className="audit-event">{activityLabel(r.action)}</strong>
                        <span className="cell-note">{activityCategory(r.action)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                count={data.count}
                page={page}
                size={5}
                onPage={setPage}
              />
            </>
          )
        )}
      </section>
    </>
  );
}

function AdminOverview({ navigate }) {
  return <Dashboard navigate={navigate} />;
}
