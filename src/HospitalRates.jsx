import { useEffect, useState } from "react";
import { api } from "./api.js";
import "./hospital-rates.css";

export const EXAMS = [
  ["70551", "MRI brain without contrast"],
  ["73721", "MRI knee without contrast"],
  ["72148", "MRI lumbar spine without contrast"],
  ["70450", "CT head without contrast"],
  ["71250", "CT chest without contrast"],
  ["74177", "CT abdomen and pelvis with contrast"],
];

export const defaultExam = (text = "") => (/\bct\b|cat scan/i.test(text) && !/mri/i.test(text) ? "70450" : "70551");
export const dollars = (n) => "$" + Math.round(n).toLocaleString("en-US");

// A round axis: four equal steps whose top covers every figure on the page.
export function axisFor(values) {
  const top = Math.max(...values.filter((v) => Number.isFinite(v) && v > 0), 1);
  const raw = top / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  return { step, max: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
}

const pct = (n, max) => Math.max(0, Math.min(100, (n / max) * 100));

function Bar({ label, range, max, price, tone }) {
  if (!range) return null;
  return (
    <div className="hr-row">
      <div className="hr-label">
        <strong>{label}</strong>
        <span>{range.low === range.high ? dollars(range.low) : `${dollars(range.low)} to ${dollars(range.high)}`}</span>
      </div>
      <div className="hr-track" aria-hidden="true">
        <div className={"hr-band " + tone} style={{ left: pct(range.low, max) + "%", width: Math.max(1.5, pct(range.high, max) - pct(range.low, max)) + "%" }} />
        {price ? <div className="hr-marker" style={{ left: pct(price, max) + "%" }} /> : null}
      </div>
    </div>
  );
}

export const examFamily = (cpt) => (["70450", "71250", "74177"].includes(cpt) ? "CT" : "MRI");

export default function HospitalRates({ zip: startZip = "", modality = "", prices = "" }) {
  let priceMap = {};
  try {
    priceMap = prices ? JSON.parse(prices) : {};
  } catch {
    priceMap = {};
  }
  const [zip, setZip] = useState(/^\d{5}$/.test(startZip) ? startZip : "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [cpt, setCpt] = useState(defaultExam(modality));
  const [data, setData] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let live = true;
    setData(null);
    if (!zip) return undefined;
    api(`/hospital-rates?zip=${zip}&cpt=${cpt}`)
      .then((d) => live && setData(d))
      .catch(() => live && setData({ hospital_count: 0 }));
    return () => {
      live = false;
    };
  }, [zip, cpt]);

  const submitZip = (event) => {
    event.preventDefault();
    if (/^\d{5}$/.test(draft)) {
      setZip(draft);
      setEditing(false);
    }
  };

  if (!zip && !editing) {
    return (
      <section className="hr-panel" aria-labelledby="hr-title">
        <h2 id="hr-title">Hospitals near you publish</h2>
        <p className="hr-sub">Add your ZIP to see what hospitals near you publish for the same exam.</p>
        <button type="button" className="hr-link-button" onClick={() => setEditing(true)}>Add your ZIP</button>
      </section>
    );
  }
  if (!editing && data && !data.hospital_count && cpt === defaultExam(modality)) return null;
  if (!editing && !data) return null;

  const price = priceMap[examFamily(cpt)];
  const priceNum = Number.isFinite(Number(price)) && Number(price) > 0 ? Number(price) : null;
  const ranges = data?.ranges || {};
  const axis = axisFor([priceNum, ranges.cash?.high, ranges.gross?.high, ranges.insurer?.high]);
  const hospitals = data?.hospitals || [];
  const shown = showAll ? hospitals : hospitals.slice(0, 6);
  const systems = data?.system_count ?? 0;

  return (
    <section className="hr-panel" aria-labelledby="hr-title">
      <div className="hr-head">
        <div>
          <h2 id="hr-title">Hospitals near you publish</h2>
          {data?.hospital_count ? (
            <p className="hr-sub">
              {data.exam}. Figures from {data.hospital_count} {data.hospital_count === 1 ? "hospital" : "hospitals"}
              {systems && systems !== data.hospital_count ? ` in ${systems} systems` : ""} within {data.radius_miles} miles of {zip}, taken from their own price files
              {data.checked_on ? `, checked ${data.checked_on}` : ""}.
            </p>
          ) : null}
        </div>
        {editing ? (
          <form className="hr-zip" onSubmit={submitZip}>
            <label htmlFor="hr-zip-input">ZIP</label>
            <input id="hr-zip-input" inputMode="numeric" maxLength={5} value={draft} onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))} autoFocus />
            <button type="submit">Use ZIP</button>
          </form>
        ) : (
          <button type="button" className="hr-link-button" onClick={() => { setDraft(zip); setEditing(true); }}>Change ZIP</button>
        )}
      </div>
      <div className="hr-exam">
        <label htmlFor="hr-exam-select">Exam</label>
        <select id="hr-exam-select" value={cpt} onChange={(e) => setCpt(e.target.value)}>
          {EXAMS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
      </div>
      {!data ? null : !data.hospital_count ? (
        <p className="hr-sub">No hospital within {data.radius_miles || 25} miles of {zip} publishes a price for this exam.</p>
      ) : (
        <>
          {priceNum ? <p className="hr-legend"><span className="hr-key" aria-hidden="true" /> This facility {dollars(priceNum)}</p> : null}
          <div className="hr-chart">
            <Bar label="Hospital cash price" range={ranges.cash} max={axis.max} price={priceNum} tone="hr-dark" />
            <Bar label="Gross charge" range={ranges.gross} max={axis.max} price={priceNum} tone="hr-mid" />
            <Bar label="Insurer negotiated rates" range={ranges.insurer} max={axis.max} price={priceNum} tone="hr-light" />
            <div className="hr-row hr-axis-row">
              <div />
              <div className="hr-axis" aria-hidden="true">
                {axis.ticks.map((t, i) => <span key={t} style={i === 0 ? { left: 0 } : i === 4 ? { right: 0 } : { left: pct(t, axis.max) + "%", transform: "translateX(-50%)" }}>{dollars(t)}</span>)}
              </div>
            </div>
          </div>
          <p className="hr-note">{data.reading_note} Ranges show the lowest and highest each hospital posts. They describe what hospitals publish, and your own cost depends on your plan.</p>
          <h3>Hospital by hospital, nearest first</h3>
          <div className="hr-table-wrap">
            <table className="hr-table">
              <thead>
                <tr><th>Hospital</th><th>Distance</th><th>Cash price</th><th>Gross charge</th><th>Insurer rates</th></tr>
              </thead>
              <tbody>
                {shown.map((h) => (
                  <tr key={h.cms_number}>
                    <td data-label="Hospital"><strong>{h.hospital_name}</strong></td>
                    <td data-label="Distance">{h.distance_miles} mi</td>
                    <td data-label="Cash price">{h.cash_price ? dollars(h.cash_price) : <span className="hr-muted">Not posted</span>}</td>
                    <td data-label="Gross charge">{h.gross_charge ? dollars(h.gross_charge) : <span className="hr-muted">Not posted</span>}</td>
                    <td data-label="Insurer rates">{h.negotiated_low ? `${dollars(h.negotiated_low)} to ${dollars(h.negotiated_high)}` : <span className="hr-muted">Not posted</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hospitals.length > 6 ? (
            <button type="button" className="hr-link-button" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer" : `Show all ${hospitals.length} hospitals`}
            </button>
          ) : null}
          <p className="hr-foot">Hospitals that post no price for this exam are left out.</p>
        </>
      )}
    </section>
  );
}
