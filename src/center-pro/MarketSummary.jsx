import { useState } from "react";
import { useResource } from "./useResource.js";
import { Alert, money } from "./components.jsx";

export default function MarketSummary({ center, refresh }) {
  const [capture, setCapture] = useState(5);
  const resource = useResource(`/centers/${center.id}/market`, refresh);
  const data = resource.data;
  const pool = data?.estimated_scans;
  const scans = pool == null ? null : Math.round(pool * capture / 100);
  const price = data?.illustrative_price;
  return <section className="panel dashboard-activity market-summary">
    <div className="dashboard-section-heading"><div><h2>Local market opportunity</h2><p>Hospital MRI / annual scenario</p></div><span className="badge neutral">{data?.is_sample ? "Sample data" : "Market estimate"}</span></div>
    {resource.loading ? <p role="status">Loading market estimates...</p> : resource.error ? <Alert error>{resource.error}</Alert> : pool == null ? <p className="muted">Market estimates are currently unavailable.</p> : <>
      <div className="market-summary-grid">
        <label className="field market-capture">Capture assumption <strong>{capture}%</strong><input aria-label="Capture assumption" type="range" min="0" max="20" step="1" value={capture} onChange={e => setCapture(Number(e.target.value))} /></label>
        <div><span>Estimated pool</span><strong>{pool.toLocaleString()}</strong><small>scans / year</small></div>
        <div><span>Scenario scans</span><strong>{scans.toLocaleString()}</strong><small>scans / year</small></div>
        <div><span>Illustrative revenue</span><strong>{price == null ? "Unavailable" : money(scans * Number(price))}</strong><small>per year / not collected</small></div>
      </div>
      <details className="market-assumptions"><summary>Source and assumptions</summary><p>{data.source}</p><p>Rounded scenario scans multiplied by {price == null ? "an unavailable average price" : money(price) + " per scan"}. This is an estimate, not guaranteed revenue.</p>{data.benchmark_date && <p>Source date: {data.benchmark_date}</p>}</details>
    </>}
  </section>;
}
