import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {cardPriceSummary} from './directory-offer.js';
import {chartCeiling, dollars, hospitalRanges, imagingGet, initialZip, normalizeHospitals, positive, rangeLabel, sourceUrl, validZip} from './imaging-prices.js';
import './hospital-comparison.css';

const modalities = ['MRI','CT','ECHO','ULTRASOUND'];
function serviceOf(offer, search) {
  const value = String(search.mod || offer?.mod || '').toUpperCase();
  return modalities.includes(value) ? value : 'MRI';
}
function facilityAmount(offer, modality) {
  if (positive(offer?.amount) !== null && offer.mod === modality) return offer.amount;
  const summary = cardPriceSummary(offer || {}) || '';
  const line = summary.split('\n').find(value => value.startsWith(modality + ':'));
  return line ? positive(Number(line.match(/\$([\d,]+(?:\.\d+)?)/)?.[1]?.replaceAll(',',''))) : null;
}
export function RangeChart({ranges, facilityPrice}) {
  const ceiling = chartCeiling(ranges, facilityPrice);
  const marker = positive(facilityPrice) !== null ? facilityPrice / ceiling * 100 : null;
  return <div className="hc-chart" role="img" aria-label={ranges.map(item=>`${item.label}: ${rangeLabel(item.values)}`).join('. ') + (marker !== null ? `. This facility ${dollars(facilityPrice)}.` : '')}>
    {marker !== null && <div className="hc-marker-heading"><span style={{'--hc-marker':`${marker}%`}}>This facility {dollars(facilityPrice)}</span></div>}
    {ranges.map(item => <div className={`hc-range hc-range-${item.key}`} key={item.key}>
      <div className="hc-range-label"><strong>{item.label}</strong><span>{rangeLabel(item.values)}</span></div>
      <div className="hc-track">{item.values.length > 0 && <span className="hc-range-fill" style={{left:`${Math.min(...item.values)/ceiling*100}%`,width:`${Math.max(0.6,(Math.max(...item.values)-Math.min(...item.values))/ceiling*100)}%`,maxWidth:'100%'}}/>}{marker !== null && <span className="hc-facility-line" style={{left:`${marker}%`}}/>}{!item.values.length && <span className="hc-track-empty">Not posted</span>}</div>
    </div>)}
    <div className="hc-axis">{[0,0.25,0.5,0.75,1].map(value=><span key={value}>{value===0?'$0':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(ceiling*value)}</span>)}</div>
  </div>;
}
function HospitalRow({row,code,zip}) {
  const source=sourceUrl(row,code,zip);
  const insurer=rangeLabel([row.insured_min,row.insured_max].filter(value=>positive(value)!==null).length ? [row.insured_min,row.insured_max] : [row.insured_median]);
  return <tr><th scope="row"><strong>{row.hospital_name || 'Hospital'}</strong></th><td className="hc-distance" aria-label="Distance not provided">—</td><td data-label="Cash">{dollars(positive(row.self_pay_median) ?? row.self_pay_min)}</td><td data-label="Gross">{dollars(row.gross_charge)}</td><td data-label="Insurer">{insurer}</td><td className="hc-source"><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}<span className="sr-only"> for {row.hospital_name}</span></a></td></tr>;
}
export default function HospitalComparison({offer,search={},account={}}) {
  const id=useId();
  const [zip,setZip]=useState(()=>initialZip(offer?.entry,search,account));
  const [zipDraft,setZipDraft]=useState(zip);
  const [editingZip,setEditingZip]=useState(!zip);
  const [editingExam,setEditingExam]=useState(true);
  const [phone,setPhone]=useState(()=>window.matchMedia('(max-width:600px)').matches);
  useEffect(()=>{const media=window.matchMedia('(max-width:600px)');const change=()=>setPhone(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  const [zipError,setZipError]=useState('');
  const [modality,setModality]=useState(()=>serviceOf(offer,search));
  const [contrast,setContrast]=useState(['with','without','both'].includes(search.contrast)?search.contrast:'');
  const [query,setQuery]=useState(search.body || '');
  const [submittedQuery,setSubmittedQuery]=useState(query);
  const [procedures,setProcedures]=useState([]);
  const [code,setCode]=useState('');
  const [proceduresLoading,setProceduresLoading]=useState(true);
  const [procedureError,setProcedureError]=useState('');
  const [prices,setPrices]=useState([]);
  const [loading,setLoading]=useState(false);
  const [priceError,setPriceError]=useState('');
  const [procedureRetry,setProcedureRetry]=useState(0);
  const [priceRetry,setPriceRetry]=useState(0);
  const [expanded,setExpanded]=useState(false);
  const [confirmedScope,setConfirmedScope]=useState(false);
  const [nearby,setNearby]=useState(null);
  const [nearbyLoading,setNearbyLoading]=useState(false);
  const [nearbyError,setNearbyError]=useState('');
  const nearbyRequest=useRef(null);
  useEffect(()=>()=>nearbyRequest.current?.abort(),[]);
  useEffect(()=>{nearbyRequest.current?.abort();setNearby(null);setNearbyError('');setNearbyLoading(false);},[zip,code]);
  useEffect(()=>{
    const controller=new AbortController();setProceduresLoading(true);setProcedureError('');setCode('');setPrices([]);setConfirmedScope(false);
    const params=new URLSearchParams({modality,limit:'200'});if(contrast)params.set('contrast',contrast);if(submittedQuery.trim())params.set('q',submittedQuery.trim());
    imagingGet('/imaging/procedures?'+params,{signal:controller.signal}).then(rows=>{if(!controller.signal.aborted)setProcedures(rows);}).catch(error=>{if(!controller.signal.aborted){setProcedures([]);setProcedureError(error.name==='AbortError'?'The procedure search timed out. Please try again.':error.message);}}).finally(()=>{if(!controller.signal.aborted)setProceduresLoading(false);});
    return ()=>controller.abort();
  },[modality,contrast,submittedQuery,procedureRetry]);
  useEffect(()=>{
    setExpanded(false);setConfirmedScope(false);setPrices([]);setPriceError('');
    if(!code || !validZip(zip)){setLoading(false);return;}
    const controller=new AbortController();setLoading(true);
    imagingGet(`/imaging/procedures/${encodeURIComponent(code)}/prices?zip=${zip}`,{signal:controller.signal}).then(rows=>{if(!controller.signal.aborted)setPrices(normalizeHospitals(rows,zip));}).catch(error=>{if(!controller.signal.aborted)setPriceError(error.name==='AbortError'?'The hospital price request timed out. Please try again.':error.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[code,zip,priceRetry]);
  const selected=procedures.find(item=>item.code===code);
  const ranges=useMemo(()=>hospitalRanges(prices),[prices]);
  const amount=facilityAmount(offer,modality);
  const count=prices.length;
  const previewCount=phone?4:6;
  function applyZip(event){event.preventDefault();if(!validZip(zipDraft)){setZipError('Enter a valid 5-digit US ZIP code.');return;}setZip(zipDraft);setEditingZip(false);if(code)setEditingExam(false);setZipError('');}
  async function suggestZips(){
    nearbyRequest.current?.abort();const controller=new AbortController();nearbyRequest.current=controller;setNearbyLoading(true);setNearbyError('');
    try{const rows=await imagingGet(`/imaging/zip/${zip}/nearby`,{signal:controller.signal});if(!controller.signal.aborted)setNearby(rows.filter(row=>validZip(row.zip5)&&row.zip5!==zip));}
    catch(error){if(!controller.signal.aborted)setNearbyError(error.name==='AbortError'?'The ZIP suggestion request timed out. Try again.':error.message);}
    finally{if(!controller.signal.aborted)setNearbyLoading(false);}
  }
  return <section className="hospital-comparison" aria-labelledby={`${id}-title`}>
    <div className="hc-heading"><div><h2 id={`${id}-title`}>Hospitals near you publish</h2><p>{selected ? `${selected.description}. ` : 'Compare published hospital cash, gross, and negotiated insurance prices. '}{count ? `Figures from ${count} hospital${count===1?'':'s'} in ZIP ${zip}.` : zip ? `Search hospitals in ZIP ${zip}.` : 'Enter a ZIP code to find hospital prices.'}</p></div><div className="hc-heading-actions"><button type="button" className="hc-button" onClick={()=>{setZipDraft(zip);setEditingZip(true);setEditingExam(true);}}>Change ZIP</button></div></div>
    {editingZip && <form className="hc-zip-form" onSubmit={applyZip}><label htmlFor={`${id}-zip`}>US ZIP code<input id={`${id}-zip`} autoFocus value={zipDraft} onChange={event=>setZipDraft(event.target.value.replace(/\D/g,'').slice(0,5))} inputMode="numeric" autoComplete="postal-code" maxLength={5} aria-invalid={!!zipError} aria-describedby={zipError?`${id}-zip-error`:undefined}/></label><button className="hc-button hc-button-primary" type="submit">Use ZIP</button>{zip && <button type="button" className="hc-text-button" onClick={()=>{setEditingZip(false);if(code)setEditingExam(false);}}>Cancel</button>}{zipError&&<p id={`${id}-zip-error`} role="alert" className="hc-error">{zipError}</p>}</form>}
    {(!code||editingExam)&&<div className="hc-exam-controls">{amount!==null&&<label className="hc-scope-confirm"><input type="checkbox" checked={confirmedScope} onChange={event=>setConfirmedScope(event.target.checked)}/><span>This is the same exam and contrast as this facility’s listed {modality} price ({dollars(amount)}).</span></label>}<div className="hc-exam-filter"><label htmlFor={`${id}-modality`}>Imaging service<select id={`${id}-modality`} value={modality} onChange={event=>setModality(event.target.value)}>{modalities.map(value=><option key={value} value={value}>{value==='ECHO'?'Echocardiogram':value==='ULTRASOUND'?'Ultrasound':value}</option>)}</select></label><label htmlFor={`${id}-contrast`}>Contrast<select id={`${id}-contrast`} value={contrast} onChange={event=>setContrast(event.target.value)}><option value="">All contrast options</option><option value="without">Without contrast</option><option value="with">With contrast</option><option value="both">With and without</option><option value="unspecified">Unspecified</option></select></label></div><form className="hc-procedure-search" onSubmit={event=>{event.preventDefault();setSubmittedQuery(query);setProcedureRetry(value=>value+1);}}><label htmlFor={`${id}-query`}>Find an exam or procedure code<input id={`${id}-query`} value={query} onChange={event=>setQuery(event.target.value)} placeholder="e.g. brain or 70450" maxLength={100}/></label><button type="submit" className="hc-button">Search exams</button></form><label htmlFor={`${id}-procedure`}>Procedure<select id={`${id}-procedure`} value={code} disabled={proceduresLoading||!procedures.length} onChange={event=>{setCode(event.target.value);if(event.target.value){setEditingExam(false);setEditingZip(false);}}}><option value="">{proceduresLoading?'Loading procedures…':procedures.length?'Choose the exact procedure':'No matching procedures'}</option>{procedures.map(item=><option key={item.code} value={item.code}>{item.code} · {item.description}</option>)}</select></label>{!proceduresLoading&&!procedureError&&!procedures.length&&<p className="hc-help">No procedures match these filters. Try a broader exam name or a different contrast option.</p>}</div>}
    {procedureError&&<div className="hc-error" role="alert"><p>{procedureError}</p><button className="hc-button" type="button" onClick={()=>setProcedureRetry(value=>value+1)}>Try again</button></div>}
    {loading&&<div className="hc-loading" role="status"><span className="hc-spinner" aria-hidden="true"/>Loading hospital prices…</div>}
    {priceError&&<div className="hc-error" role="alert"><p>{priceError}</p><button className="hc-button" type="button" onClick={()=>setPriceRetry(value=>value+1)}>Try again</button></div>}
    {!loading&&!priceError&&code&&zip&&!count&&<div className="hc-empty"><h3>No published prices in this ZIP</h3><p>Try another ZIP or procedure. An empty result does not mean a hospital does not offer this exam.</p><button type="button" className="hc-button" disabled={nearbyLoading} onClick={suggestZips}>{nearbyLoading?'Loading ZIP suggestions…':'Suggest other ZIP codes'}</button>{nearby&&<><p className="hc-help">ZIPs sharing the first three digits; these are not distance-based suggestions.</p><div className="hc-zip-suggestions">{nearby.length?nearby.map(row=><button type="button" className="hc-button" key={row.zip5} onClick={()=>{setZip(row.zip5);setZipDraft(row.zip5);}}>{row.zip5} · {row.city}</button>):<p>No alternative ZIPs with data were found.</p>}</div></>}{nearbyError&&<p role="alert" className="hc-error">{nearbyError}</p>}</div>}
    {!loading&&!priceError&&count>0&&<><div className="hc-comparison-data"><RangeChart ranges={ranges} facilityPrice={confirmedScope?amount:null}/><p className="hc-caveat">Hospital figures may not include the radiologist’s reading. Ranges compare posted hospital prices, not personal quotes. They describe what hospitals publish, and your own cost depends on your plan.</p></div>
    <div className="hc-list-heading"><h3>Hospital by hospital</h3>{count>previewCount&&expanded&&<button className="hc-text-button" type="button" onClick={()=>setExpanded(false)}>Show fewer</button>}</div>
    <table className="hc-hospital-table"><thead><tr><th>Hospital</th><th>Distance</th><th>Cash price</th><th>Gross charge</th><th>Insurer rates</th><th>Source</th></tr></thead><tbody>{prices.slice(0,expanded?count:previewCount).map(row=><HospitalRow key={row.ccn||row.hospital_name} row={row} code={code} zip={zip}/>)}</tbody></table>{count>previewCount&&!expanded&&<button className="hc-button hc-show-all" type="button" onClick={()=>setExpanded(true)}>Show all {count} hospitals</button>}<p className="hc-footnote">Hospitals that post no price for this exam are left out. Each hospital appears once; shared health-system price files may appear separately.</p><details className="hc-data-notes"><summary>About these prices and sources</summary><p>Results are for ZIP {zip}, in alphabetical order. The API does not provide distances, so nearest-first sorting is unavailable. Cash prices are medians, or posted minimums when no median is available. Insurer ranges use posted minimum and maximum rates, falling back to a median.</p><p>Contrast labels are inferred from descriptions. Professional-component and special-condition prices may be included. “API record” opens the API response. A direct price-file link is shown only when supplied.</p></details></>}
    {!code&&!proceduresLoading&&!procedureError&&<p className="hc-select-prompt">Choose a procedure above to see the price comparison.</p>}
  </section>;
}
