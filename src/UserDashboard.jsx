import { useEffect, useState } from "react";
import { api } from "./api.js";

const labels = {requested:"Awaiting center confirmation",voicemail:"Center follow-up in progress",scheduled:"Confirmed by center",unable:"Center unable to schedule",expired:"Request expired"};
export default function UserDashboard({account}) {
  const [tab,setTab]=useState("overview"),[page,setPage]=useState(1),[value,setValue]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
  const signedIn = account && account.tenant !== "guest";
  useEffect(()=>{
    if (!signedIn) return;
    let active=true;
    const load=async()=>{ try { const next=await api(`/dashboard?page=${page}&filter=${tab === "open" ? "open" : "all"}`); if(active){setValue(next);setError("");} } catch(e){if(active)setError(e.message);} finally{if(active)setLoading(false);} };
    setLoading(true);void load();
    const timer=setInterval(load,30000);
    return ()=>{active=false;clearInterval(timer);};
  },[signedIn,account?.id,tab,page,refresh]);
  if(!signedIn) return <section className="panel account-page"><h1>Your dashboard</h1><p>Log in to view your profile and appointment requests.</p><a className="button" href="#login">Log in</a></section>;
  function select(next){setTab(next);setPage(1);}
  const stats=value?.stats||{}, open=(stats.requested||0)+(stats.voicemail||0), total=Object.values(stats).reduce((a,b)=>a+b,0);
  return <section className="user-dashboard">
    <div className="dashboard-heading"><div><p className="eyebrow">MYSELFPAY ACCOUNT</p><h1>Welcome, {value?.profile.name || account.name}</h1><p className="muted">Manage your profile and follow your appointment requests.</p></div><a className="button" href="#search">Find imaging centers</a></div>
    <nav className="dashboard-tabs" aria-label="Dashboard sections">{[["overview","Overview"],["profile","My profile"],["open","Open requests"],["all","All requests"]].map(([key,label])=><button type="button" key={key} aria-current={tab===key?"page":undefined} onClick={()=>select(key)}>{label}</button>)}</nav>
    {error && <p role="alert">{error}</p>}
    {loading && <p role="status">Loading your dashboard…</p>}
    {value && <>
      {tab==="overview" && <div className="dashboard-metrics">{[["Total requests",total],["Open requests",open],["Confirmed",stats.scheduled||0]].map(([name,count])=><div className="panel" key={name}><span>{name}</span><strong>{count}</strong></div>)}</div>}
      {tab==="profile" ? <section className="panel dashboard-profile"><h2>My profile</h2><dl><dt>Name</dt><dd>{value.profile.name}</dd><dt>Account email</dt><dd>{value.profile.email}</dd><dt>Mobile number</dt><dd>{value.profile.phone||"Not provided"}</dd><dt>ZIP code</dt><dd>{value.profile.zip_code||"Not provided"}</dd><dt>Verified booking email</dt><dd>{value.verified_email||"Verify your email when making your first booking"}</dd><dt>Member since</dt><dd>{new Date(value.profile.created*1000).toLocaleDateString()}</dd></dl></section> : <section className="dashboard-requests">
        <div className="dashboard-heading"><h2>{tab==="open"?"Open requests":tab==="overview"?"Recent requests":"All requests"}</h2><button type="button" disabled={loading} onClick={()=>setRefresh(n=>n+1)}>Refresh status</button></div>
        {!value.requests.length && <div className="panel"><h3>{tab==="open"?"No open requests":"No requests yet"}</h3><p>Your appointment requests and updates will appear here.</p><a href="#search">Browse imaging centers</a></div>}
        {value.requests.map(item=><article className="panel dashboard-request" key={item.id}><div className="dashboard-heading"><div><h3>{item.clinic_name}</h3><p className="muted">{item.location}</p></div><span className={`request-status status-${item.status}`}>{labels[item.status]||item.status}</span></div><p><strong>{[item.service,item.exam].filter(Boolean).join(" · ")}</strong></p><p>{item.slots.map(s=>`${new Date(s.date+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})} · ${s.period}`).join(" / ")}</p><p className="small muted">Requested {new Date(item.created*1000).toLocaleString()} · {item.id}</p><div className="actions"><a className="button" href={`#request/${encodeURIComponent(item.id)}/${encodeURIComponent(item.tracking_token)}`}>Open request</a><span className="small muted">{item.price_text}</span></div></article>)}
        {value.pages>1 && <div className="dashboard-pagination"><button type="button" disabled={loading||value.page<=1} onClick={()=>setPage(value.page-1)}>Previous</button><span>Page {value.page} of {value.pages}</span><button type="button" disabled={loading||value.page>=value.pages} onClick={()=>setPage(value.page+1)}>Next</button></div>}
        <p className="small muted">Statuses refresh automatically. The center confirms your appointment directly.</p>
      </section>}
    </>}
  </section>;
}
