import Icon from "./Icon.jsx";
import MarketSummary from "./MarketSummary.jsx";
import { activityLabel } from "./activity.js";

import { useState } from "react";

import { useResource } from "./useResource.js";

import { Alert, Pagination, dateTime } from "./components.jsx";



export default function Dashboard({ center, navigate }) {

  const [refresh, setRefresh] = useState(0);

  const [sourcePage, setSourcePage] = useState(1);
  const admin = !center;

  const staff = center?.role === "staff";
  const owner = center?.role === "owner";

  const summary = useResource(admin ? "/admin/centers?page=1" : `/centers/${center.id}/overview`, refresh);

  const activity = useResource(admin ? "/admin/audit?page=1" : `/centers/${center.id}/audit?page=1`, refresh);

  const data = summary.data;
  const currentSourcePage = Math.min(sourcePage, Math.max(1, Math.ceil((data?.request_sources?.length || 0) / 5)));

  const shortcuts = admin ? [] : staff ? [

    ["availability", "Availability", "Create and manage appointment slots"],

    ["rescue", "Self-pay links", "Create a patient request link"],

  ] : [

    ["pricing", "Pricing", "Review and update published offers"],

  ];

  const stats = admin ? [["Centers", data?.count, "Across your organization"], ["Audit events", activity.data?.count, "Organization activity"]] : [

    ["Needs scheduling", data?.pending, "Requests awaiting confirmation"],

    ["Confirmed", data?.confirmed, "Confirmed appointments"],

    ["Total requests", data?.total, "All requests for this center"],

  ];

  if (owner) stats.push(
    ["Completed scans", data?.completed_scans, "All-time completed scans"],
    ["Upcoming appointments", data?.upcoming, "Confirmed future appointments"],
  );
  return <div className="dashboard">

    <div className="page-heading dashboard-heading">

      <div><h1>{admin ? "Organization overview" : "Center overview"}</h1>

      <p>{admin ? "Your centers, access, and recent activity at a glance." : owner ? "Center performance and booking activity. All-time totals unless noted." : "Your scheduling workload and latest center activity at a glance."}</p></div>

      <button onClick={() => setRefresh(n => n + 1)} disabled={summary.loading || activity.loading}><Icon name="refresh" /> Refresh overview</button>

    </div>

    {summary.error && <Alert error>{summary.error}</Alert>}

    <section className={"panel dashboard-stats" + (owner ? " owner-performance-stats" : "")} aria-label="Overview totals">

      {stats.map(([label, value, description]) => <div className={"dashboard-stat " + (label === "Needs scheduling" && value > 0 ? "stat-attention" : ["Confirmed", "Upcoming appointments"].includes(label) && value > 0 ? "stat-confirmed" : "")} key={label}>

        <span>{label}</span><strong className={value == null ? "metric-unavailable" : undefined}>{value == null ? (summary.loading ? "..." : "Unavailable") : value.toLocaleString()}</strong><small>{description}</small>

      </div>)}

    </section>

    {summary.loading && <p role="status">Loading overview…</p>}

    <div className={"dashboard-grid" + (admin ? " dashboard-admin-grid" : "")}>

      <section className="panel">

        <div className="dashboard-section-heading"><h2>{admin ? "Center directory" : "Scheduling snapshot"}</h2><span className="muted">{admin ? "First 5 centers" : "All saved requests"}</span></div>

        {admin ? <>

          {data?.results?.length ? <ul className="dashboard-list">{data.results.slice(0, 5).map(row => <li key={row.id}>

            <div><strong>{row.name}</strong><small>{row.owners} owners · {row.staff} staff</small></div>

            <button onClick={() => navigate(`admin-access/${row.id}`)}>Manage access</button>

          </li>)}</ul> : !summary.loading && !summary.error && <p className="muted">No centers are available yet.</p>}

          <div className="actions"><button className="primary" onClick={() => navigate("admin-centers")}>View all centers</button></div>

        </> : <>

          <p className="dashboard-summary">{data ? <><strong>{data.pending.toLocaleString()}</strong> requests need scheduling</> : "Scheduling counts will appear here."}</p>

          <p className="muted">{staff ? "Review patient preferences and available slots to confirm the next appointment." : "Keep track of incoming demand and your team’s appointment confirmations."}</p>

          <div className="dashboard-status" aria-label="Request status breakdown">

            {[["Needs scheduling", data?.pending, "pending"], ["Confirmed", data?.confirmed, "confirmed"]].map(([label, value, kind]) => <div className="dashboard-status-row" key={kind}>

              <div><span>{label}</span><strong>{value ?? "—"}</strong></div>

              <div className="dashboard-track" aria-hidden="true"><span className={kind} style={{width: `${data?.total ? value / data.total * 100 : 0}%`}} /></div>

            </div>)}

          </div>

          <div className="actions"><button className="primary" onClick={() => navigate("requests")}>View requests</button>{center.role === "owner" && <button onClick={() => navigate("digest")}>30-day summary</button>}</div>

        </>}

      </section>

      {shortcuts.length > 0 && <section className="panel dashboard-shortcuts"><h2>Quick actions</h2>

        <div>{shortcuts.map(([path, title, description]) => <button key={path} onClick={() => navigate(path)}><span><strong>{title}</strong><small>{description}</small></span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>)}</div>

      </section>}
      {owner && <MarketSummary center={center} refresh={refresh} />}
      {owner && data && <section className="panel dashboard-activity">
        <div className="dashboard-section-heading"><h2>Request sources</h2><span className="muted">All-time requests</span></div>
        {data.request_sources?.length ? <ul className="dashboard-list source-breakdown">{data.request_sources.slice((currentSourcePage - 1) * 5, currentSourcePage * 5).map(row => <li key={row.source}>
          <span>{({myselfpay: "MySelfPay", cash_rescue: "Self-pay links", qr_referral: "QR referrals"})[row.source] || row.source.replaceAll("_", " ")}</span>
          <strong>{row.count.toLocaleString()} <span className="muted">({data.total ? Math.round(row.count / data.total * 100) : 0}%)</span></strong>
        </li>)}</ul> : <p className="muted">No requests yet.</p>}
        {data.request_sources?.length > 5 && <Pagination count={data.request_sources.length} page={currentSourcePage} size={5} onPage={setSourcePage} />}
      </section>}
      <section className="panel dashboard-activity">

        <div className="dashboard-section-heading"><div><h2>Recent activity</h2><p className="muted">Recent changes{admin ? " across the organization" : " in this center"}.</p></div><button onClick={() => navigate(admin ? "admin-audit" : "audit")}>View all activity</button></div>

        {activity.loading ? <p role="status">Loading activity…</p> : activity.error ? <Alert error>{activity.error}</Alert> : !activity.data?.results?.length ? <p className="dashboard-empty">No activity yet.</p> : <ul className="dashboard-list">{activity.data.results.slice(0, 4).map(row => <li key={row.id}>

          <div><strong>{activityLabel(row.action)}</strong><small>{admin ? [row.center, row.actor].filter(Boolean).join(" · ") : row.reference}</small></div>

          <time dateTime={row.created_at}>{dateTime(row.created_at, center?.timezone || "UTC")}{admin ? " UTC" : ""}</time>

        </li>)}</ul>}

      </section>

    </div>

  </div>;

}
