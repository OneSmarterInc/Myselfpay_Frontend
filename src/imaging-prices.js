const API_ORIGIN = 'https://myselfpayheathdata.onesmarter.com';
const BASE = (import.meta.env.VITE_IMAGING_API_BASE || '/imaging-prices').replace(/\/$/, '');
const cache = new Map();
export const validZip = value => /^\d{5}$/.test(String(value || ''));
export const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
export const dollars = value => positive(value) === null ? 'Not posted' : new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', minimumFractionDigits:Number.isInteger(value)?0:2, maximumFractionDigits:2}).format(value);
export function rangeLabel(values) {
  const numbers = values.filter(value => positive(value) !== null);
  if (!numbers.length) return 'Not posted';
  const low = Math.min(...numbers), high = Math.max(...numbers);
  return low === high ? dollars(low) : `${dollars(low)} to ${dollars(high)}`;
}
export function initialZip(entry = {}, search = {}, account = {}) {
  const explicit = String(search.location || '').match(/^\s*(\d{5})(?:-\d{4})?\s*$/)?.[1];
  const saved = String(account?.zip_code || '').slice(0,5);
  const location = entry.locations?.find(item => validZip(item.zip))?.zip;
  const address = String(entry.coverage || '').match(/\b\d{5}(?:-\d{4})?\b/)?.[0]?.slice(0,5);
  return explicit || (validZip(saved) ? saved : '') || location || address || '';
}
export function normalizeHospitals(rows, zip) {
  const seen = new Set();
  return rows.filter(row => {
    if (!row || String(row.zip5) !== zip) return false;
    const key = String(row.ccn || row.hospital_name || '');
    if (!key || seen.has(key)) return false;
    const posted = ['self_pay_median','self_pay_min','gross_charge','insured_median','insured_min','insured_max'].some(key => positive(row[key]) !== null);
    if (posted) seen.add(key);
    return posted;
  }).sort((a,b) => String(a.hospital_name).localeCompare(String(b.hospital_name)));
}
export function hospitalRanges(rows) {
  return [
    {key:'cash', label:'Hospital cash price', values:rows.flatMap(row => positive(row.self_pay_median) !== null ? [row.self_pay_median] : positive(row.self_pay_min) !== null ? [row.self_pay_min] : [])},
    {key:'gross', label:'Gross charge', values:rows.map(row => row.gross_charge).filter(value => positive(value) !== null)},
    {key:'insured', label:'Insurer negotiated rates', values:rows.flatMap(row => [row.insured_min, row.insured_max].filter(value => positive(value) !== null).length ? [row.insured_min,row.insured_max].filter(value => positive(value) !== null) : positive(row.insured_median) !== null ? [row.insured_median] : [])},
  ];
}
export function chartCeiling(ranges, facilityPrice) {
  const maximum = Math.max(1, ...ranges.flatMap(item=>item.values), positive(facilityPrice) || 0);
  const rawStep=maximum/4;
  const unit=10**Math.floor(Math.log10(rawStep));
  const factor=[1,2,2.5,4,5,8,10].find(value=>value*unit>=rawStep)||10;
  return factor*unit*4;
}
export function sourceUrl(row, code, zip) {
  for (const value of [row.source_url, row.price_file_url]) {
    try { const url = new URL(value); if (url.protocol === 'https:' || url.protocol === 'http:') return {href:url.href,label:'Price file'}; } catch {}
  }
  return {href:`${API_ORIGIN}/imaging/procedures/${encodeURIComponent(code)}/prices?zip=${encodeURIComponent(zip)}`,label:'API record'};
}
export async function imagingGet(path, {signal} = {}) {
  const saved = cache.get(path);
  if (saved && Date.now() - saved.at < 300000) return saved.value;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  const timer = setTimeout(abort, 35000);
  try {
    const response = await fetch(BASE + path, {signal:controller.signal,credentials:'omit',headers:{Accept:'application/json'}});
    if (response.status !== 200) throw new Error('Hospital prices are temporarily unavailable. Please try again.');
    const value = await response.json();
    if (!Array.isArray(value)) throw new Error('The price service returned an unexpected response. Please try again.');
    if (cache.size >= 50) cache.delete(cache.keys().next().value);
    cache.set(path,{at:Date.now(),value});
    return value;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort',abort); }
}
