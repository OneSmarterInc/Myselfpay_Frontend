import Icon from "./Icon.jsx";
import { useEffect, useState } from "react";
import { api } from "./api.js";
import { useResource } from "./useResource.js";
import { Alert, Status, Pagination, money, dateTime } from "./components.jsx";

export default function RequestDetails({ center, id, navigate }) {
  const [refresh, setRefresh] = useState(0),
    [preferencePages, setPreferencePages] = useState([1, 1, 1]),
    [selected, setSelected] = useState(""),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const booking = useResource(`/centers/${center.id}/requests/${id}`, refresh);
  const availability = useResource(
    booking.data?.status === "pending" && ["staff", "owner"].includes(center.role)
      ? `/centers/${center.id}/slots?booking_id=${id}&${preferencePages.map((page,index) => `preference_page_${index}=${page}`).join("&")}`
      : null,
    refresh,
  );
  useEffect(() => {
    setSelected("");
    setReview(false);
    setError("");
    setSaved(false);
  }, [id, center.id]);
  async function confirm() {
    if (busy || !selected) return;
    setBusy(true);
    setError("");
    try {
      await api(`/centers/${center.id}/requests/${id}/confirm`, {
        method: "POST",
        body: { slot_id: Number(selected) },
      });
      setSaved(true);
      setReview(false);
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.message);
      if (e.status === 409) {
        setSelected("");
        setReview(false);
        setRefresh((n) => n + 1);
      }
    } finally {
      setBusy(false);
    }
  }
  const slot = availability.data?.flatMap(s => s.slots || [s]).find((s) => String(s.id) === selected);
  return (
    <>
      <button className="text-button" onClick={() => navigate("requests")}>
        <Icon name="back" /> Back to requests
      </button>
      <div className="page-heading request-heading">
        <h1>Request details</h1>
        {["staff", "owner"].includes(center.role) && (
          <button onClick={() => navigate("estimate/" + id)}>
            Estimate drafts
          </button>
        )}
        <p>All appointment times use {center.timezone}.</p>
      </div>
      {saved && (
        <Alert>
          Appointment confirmed. Patient notification has not been sent.
        </Alert>
      )}
      {error && <Alert error>{error}</Alert>}
      {booking.loading ? (
        <p role="status">Loading request…</p>
      ) : booking.error ? (
        <Alert error>{booking.error}</Alert>
      ) : (
        booking.data && (
          <div className="detail-grid request-layout">
            <section className="panel request-summary">
              <div className="request-summary-heading"><h2>{booking.data.reference}</h2><Status value={booking.data.status} /></div>
              <dl>
                <dt>Patient</dt>
                <dd>{booking.data.patient_name}</dd>
                <dt>Exam</dt>
                <dd>{booking.data.exam}</dd>
                <dt>Agreed price</dt>
                <dd>{money(booking.data.price_snapshot)}</dd>
                <dt>Source</dt>
                <dd>{booking.data.source.replaceAll("_", " ")}</dd>
                <dt>Preferences</dt>
                <dd>{booking.data.preferred_slot_ids?.length ? `${booking.data.preferred_slot_ids.length} submitted slot choices` : booking.data.preferred_windows.map(value => typeof value === "object" ? `${value.date} / ${value.period === "morning" ? "Morning" : "Afternoon"}` : Number.isNaN(Date.parse(value)) ? value : dateTime(value, center.timezone)).join("; ") || "Specific slots not provided"}</dd>
                {booking.data.slot && (
                  <>
                    <dt>Appointment</dt>
                    <dd>
                      {dateTime(booking.data.slot.starts_at, center.timezone)}
                    </dd>
                  </>
                )}
              </dl>
            </section>
            <section className="panel request-scheduling">
              <h2>
                {booking.data.status === "confirmed"
                  ? "Appointment confirmed"
                  : review
                    ? "Review appointment"
                    : "Choose a patient slot"}
              </h2>
              {booking.data.status === "confirmed" ? (
                <>

                  <button onClick={() => navigate("schedule")}>
                    View confirmed requests
                  </button>
                </>
              ) : !["staff", "owner"].includes(center.role) ? (
                <p>
                  Staff assigned to this center can select a slot and confirm
                  this request.
                </p>
              ) : availability.loading ? (
                <p role="status">Loading patient choices…</p>
              ) : availability.error ? (
                <>
                  <Alert error>{availability.error}</Alert>
                  <button onClick={() => setRefresh((n) => n + 1)}>
                    Retry availability
                  </button>
                </>
              ) : review && slot ? (
                <>
                  <dl>
                    <dt>Appointment</dt>
                    <dd>{dateTime(slot.starts_at, center.timezone)}</dd>
                    <dt>Resource</dt>
                    <dd>{slot.resource}</dd>
                    <dt>Price</dt>
                    <dd>{money(booking.data.price_snapshot)}</dd>
                  </dl>
                  <SlotOverlaps slot={slot} timezone={center.timezone} />
                  <p>
                    Check the appointment details before confirming.
                  </p>
                  <div className="actions">
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={confirm}
                    >
                      <Icon name="check" /> {busy ? "Confirming…" : "Confirm appointment"}
                    </button>
                    <button disabled={busy} onClick={() => setReview(false)}>
                      Change time
                    </button>
                  </div>
                </>
              ) : !availability.data?.length ? (
                <p>
                  This request has no specific patient slot choices. Obtain three
                  date and period preferences from the patient before confirming.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setReview(true);
                  }}
                >
                  <fieldset className="patient-choices">
                    <legend>Patient's preferred times</legend>
                    {availability.data.map((s, index) => s.slots ? (
                      <PeriodChoice key={s.id} group={s} index={index} selected={selected} onSelect={setSelected} timezone={center.timezone} onPage={page => { setSelected(""); setReview(false); setPreferencePages(pages => pages.map((value,i) => i === index ? page : value)); }} />
                    ) : (
                      <div className={"patient-choice choice-card " + (s.conflict ? "has-conflict" : !s.selectable ? "is-unavailable" : "is-available") + (selected === String(s.id) ? " is-selected" : "")} key={s.id}>
                        <div className="choice-topline">
                          <label className="check-label">
                            <input type="radio" name="patient-slot" required value={s.id}
                              checked={selected === String(s.id)} disabled={!s.selectable}
                              onChange={(e) => setSelected(e.target.value)} />
                            <span><strong>Choice {index + 1} / {dateTime(s.starts_at, center.timezone)}</strong>
                              <small>{s.resource} / {slotRange(s, center.timezone)}</small></span>
                          </label>
                          <span className={"badge " + (s.conflict ? "conflict-badge" : !s.selectable ? "pending" : "success")}>
                            {s.conflict ? "Conflict" : !s.selectable ? "Unavailable" : selected === String(s.id) ? "Selected" : "Available"}
                          </span>
                        </div>
                        {!s.selectable && <p className="choice-conflict">{s.conflict ? "This scanner or room is already booked. Choose another slot." : s.unmatched ? "No center slot matches this preferred time. Add availability for this time before confirming." : "This time is blocked or has passed. Choose another slot."}</p>}
                        <SlotOverlaps slot={s} timezone={center.timezone} />
                      </div>
                    ))}
                  </fieldset>
                  <p>Patient payments are handled outside Center Pro.</p>
                  {availability.data.some(group => group.slots ? group.slots.some(item=>item.selectable) : group.selectable) && <button className="primary" type="submit" disabled={!slot?.selectable}>
                    <Icon name="check" /> Review confirmation
                  </button>}
                </form>
              )}
              {booking.data.status === "pending" && ["staff","owner"].includes(center.role) && <AlternativeTime center={center} id={id} onSaved={()=>{setSaved(true);setRefresh(n=>n+1)}} />}
            </section>
          </div>
        )
      )}
    </>
  );
}

function slotRange(slot, timezone) {
  if (!slot.ends_at) return "Duration to be set by the center";
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).formatRange(new Date(slot.starts_at), new Date(slot.ends_at));
}
function SlotOverlaps({ slot, timezone }) {
  if (slot.unmatched) return <p className="choice-conflict">Overlap check pending: duration and resource are not assigned. <a href="#center-pro/availability">Manage availability</a></p>;
  if (!slot.overlap_count) return <p className="no-overlap">No overlapping confirmed appointments</p>;
  return <div className={"overlap-summary " + (slot.conflict ? "overlap-conflict" : "overlap-info")}>
    <strong>{slot.overlap_count} overlapping confirmed {slot.overlap_count === 1 ? "appointment" : "appointments"}</strong>
    <p>{slot.conflict ? "Same-resource overlap prevents confirmation." : "Other resources are booked at this time."}</p>
    <ul>{slot.appointments.map(a => <li key={a.reference}>
      <span><strong>{a.reference}</strong><small>{a.resource}</small></span>
      <span>{slotRange(a, timezone)}</span>
    </li>)}</ul>
    {slot.overlap_count > slot.appointments.length && <a href="#center-pro/schedule">View confirmed requests for all appointment times</a>}
  </div>;
}

function PeriodChoice({ group, index, selected, onSelect, timezone, onPage }) {
  const slot=group.slots.find(s => String(s.id) === selected);
  const date = new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(group.date+'T12:00:00Z'));
  return <div className={"patient-choice choice-card period-choice" + (group.detail ? " is-unavailable" : "")}>
    <div className="choice-topline"><strong>Choice {index + 1} / {date}</strong><span className={"badge " + (group.detail ? "pending" : "success")}>{group.detail ? "Unavailable" : "Choose time"}</span></div>
    <small>{group.period === "morning" ? "Morning / 8 AM - 12 PM" : "Afternoon / 12 - 5 PM"}</small>
    {group.detail ? <p className="preference-unavailable">No available appointment in this period. Choose an alternative time below.</p> : <>
      <label className="field">Exact appointment time
        <select value={slot ? selected : ""} onChange={e => onSelect(e.target.value)}>
          <option value="">Select a center slot</option>
          {group.slots.map(s => <option key={s.id} value={s.id}>{slotRange(s,timezone)} / {s.resource}{s.conflict ? " / Conflict" : !s.selectable ? " / Blocked" : ""}</option>)}
        </select>
      </label>
      {group.count > group.page_size && <Pagination count={group.count} page={group.page} size={group.page_size} onPage={onPage} />}
      {slot && <><p className={slot.selectable ? "no-overlap" : "choice-conflict"}>{slot.selectable ? "Available for confirmation" : "Unavailable. Select another time."}</p><SlotOverlaps slot={slot} timezone={timezone} /></>}
    </>}
  </div>;
}


function AlternativeTime({center,id,onSaved}) {
  const [form,setForm]=useState({starts_at:'',ends_at:'',resource:'',reason:'',patient_agreed:false});
  const [review,setReview]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const update=(key,value)=>{setReview(false);setForm(old=>({...old,[key]:value}))};
  async function submit(event){
    event.preventDefault();if(!review){setReview(true);return;}
    setBusy(true);setError('');
    try{await api(`/centers/${center.id}/requests/${id}/alternative-time`,{method:'POST',body:form});onSaved()}catch(e){setError(e.message);setReview(false)}finally{setBusy(false)}
  }
  return <details className="alternative-time"><summary>Choose an alternative time</summary><p>If the preferred times are unavailable, agree a different time with the patient. This explicitly overrides the saved working hours and patient preferences; existing appointments are still protected.</p><p>Enter times in {center.timezone}.</p>{error&&<Alert error>{error}</Alert>}<form onSubmit={submit}>
    <div className="alternative-time-fields">{[['starts_at','Start time','datetime-local'],['ends_at','End time','datetime-local'],['resource','Scanner or room','text'],['reason','Reason for alternative time','text']].map(([key,label,type])=><label className="field" key={key}>{label}<input type={type} required maxLength={key==='resource'?80:500} value={form[key]} onChange={e=>update(key,e.target.value)} /></label>)}</div>
    <label className="check-label"><input type="checkbox" required checked={form.patient_agreed} onChange={e=>update('patient_agreed',e.target.checked)} />The patient agreed to this time and the center can accommodate it.</label>
    {review&&<p role="status">Confirm {form.starts_at.replace('T',' ')} to {form.ends_at.replace('T',' ')} in {form.resource}. Time zone: {center.timezone}.</p>}
    <button className="primary" disabled={busy}>{busy?'Confirming...':review?'Confirm alternative appointment':'Review alternative time'}</button>
  </form></details>;
}
