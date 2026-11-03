import { useRef, useState } from "react";

export function OTPInput({id, value, onChange, disabled, label}) {
  const refs = useRef([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");
  function enter(index, text) {
    const clean = text.replace(/\D/g, "").slice(0, 6 - index);
    const next = [...digits];
    if (!clean) next[index] = " ";
    else [...clean].forEach((digit, offset) => { next[index + offset] = digit; });
    onChange(next.join("").trimEnd());
    refs.current[Math.min(5, index + clean.length)]?.focus();
  }
  return <div className="otp-input-group" role="group" aria-label={label}>
    {digits.map((digit, index) => <input key={index} ref={el => { refs.current[index] = el; }}
      id={index === 0 ? id : `${id}-${index + 1}`} aria-label={`${label}, digit ${index + 1} of 6`}
      type="text" inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"}
      value={digit.trim()} disabled={disabled} onFocus={e => e.target.select()}
      onChange={e => enter(index, e.target.value)} onPaste={e => { e.preventDefault(); enter(index, e.clipboardData.getData("text")); }}
      onKeyDown={e => {
        if (e.key === "Backspace") { e.preventDefault(); const target = digits[index].trim() ? index : Math.max(0, index - 1); const next = [...digits]; next[target] = " "; onChange(next.join("").trimEnd()); refs.current[target]?.focus(); }
        if (e.key === "ArrowLeft") refs.current[Math.max(0, index - 1)]?.focus();
        if (e.key === "ArrowRight") refs.current[Math.min(5, index + 1)]?.focus();
      }} />)}
  </div>;
}

function addDays(date, count) { const day = new Date(`${date}T12:00:00Z`); day.setUTCDate(day.getUTCDate() + count); return day.toISOString().slice(0, 10); }
export function TimeSlotPicker({draft, options, onSlots, onError, disabled}) {
  const [start, setStart] = useState("");
  const today = options.today?.[draft.timezone];
  if (!today) return <section className="time-choice-panel"><h3>Pick up to 3 times</h3><p>Choose the clinic’s time zone above to see dates.</p></section>;
  const max = addDays(today, 90), anchor = start >= today && start <= max ? start : today;
  const days = [];
  for (let day = anchor; days.length < 5 && day <= max; day = addDays(day, 1)) {
    if (![0, 6].includes(new Date(`${day}T12:00:00Z`).getUTCDay())) days.push(day);
  }
  const parts = new Intl.DateTimeFormat("en-US", {timeZone:draft.timezone, hour:"2-digit", minute:"2-digit", hourCycle:"h23"}).formatToParts(new Date());
  const hour = Number(parts.find(p => p.type === "hour")?.value || 0);
  function toggle(day, period) {
    const selected = draft.slots.some(s => s.date === day && s.period === period);
    if (selected) { onError(""); onSlots(draft.slots.filter(s => s.date !== day || s.period !== period)); return; }
    if (draft.slots.length >= 3) { onError("Choose up to 3 times. Deselect a time to choose another."); return; }
    onError(""); onSlots([...draft.slots, {date:day, period}]);
  }
  return <section className="time-choice-panel" aria-label="Preferred appointment times">
    <h3>Pick up to 3 times <span role="status">· {draft.slots.length} selected</span></h3>
    <p className="small muted">Preferred times only; the center will confirm availability. Morning: 8 am–12 pm. Afternoon: 12–5 pm.</p>
    <div className="time-choice-rows">{days.map(day => <div className="time-choice-row" key={day}>
      <strong>{new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {timeZone:"UTC", weekday:"short", month:"short", day:"numeric"})}</strong>
      {["morning", "afternoon"].map(period => { const selected = draft.slots.some(s => s.date === day && s.period === period); return <button key={period} type="button" aria-pressed={selected}
        disabled={disabled || (day === today && hour >= (period === "morning" ? 8 : 12))}
        onClick={() => toggle(day, period)}>{period === "morning" ? "Morning" : "Afternoon"}</button>; })}
    </div>)}</div>
    <div className="time-choice-navigation"><button type="button" disabled={disabled || anchor === today} onClick={() => setStart(addDays(anchor, -7) < today ? today : addDays(anchor, -7))}>Previous</button>
      <label>Choose another date<input type="date" id="bookingDate" min={today} max={max} value={anchor} disabled={disabled} onChange={e => setStart(e.target.value)} /></label>
      <button type="button" disabled={disabled || !days.length || days.at(-1) >= max} onClick={() => setStart(addDays(days.at(-1), 1))}>Next</button></div>
    {!!draft.slots.length && <div className="time-choice-selected">{draft.slots.map(slot => <button type="button" key={slot.date + slot.period} disabled={disabled} onClick={() => toggle(slot.date, slot.period)} aria-label={`Remove ${slot.date} ${slot.period}`}>{new Date(`${slot.date}T12:00:00Z`).toLocaleDateString("en-US", {timeZone:"UTC",month:"short",day:"numeric"})} · {slot.period} ×</button>)}</div>}
  </section>;
}
