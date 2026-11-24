import {useEffect,useRef,useState} from 'react';
import {api} from './api.js';
import {chrLocation} from './chr-location.js';
import {cardPriceSummary,directoryOffer} from './directory-offer.js';
import {RangeChart} from './HospitalComparison.jsx';
import {dollars,hospitalRanges,initialZip,positive,rangeLabel,validZip} from './imaging-prices.js';
import './chr-index.css';

function listed(offer,modality){
  if(offer?.mod===modality&&positive(offer.amount)!==null)return String(offer.amount);
  const line=(cardPriceSummary(directoryOffer(offer.entry))||'').split('\n').find(value=>value.startsWith(modality+':'));
  return line?.match(/\$([\d,]+(?:\.\d+)?)/)?.[1]?.replaceAll(',','')||'';
}
function sourceOf(row){for(const value of [row.price_file_url,row.price_page_url]){try{const url=new URL(value);if(['https:','http:'].includes(url.protocol))return url.href;}catch{}}return null;}
export default function CHRIndex({offer,comparisonAPI=api,comparisonPath="/chr-index"}){
  const zip=initialZip(offer.entry);
  const {ohio,city,latitude,longitude}=chrLocation(offer);
  const mri=listed(offer,'MRI')||'0';
  const ct=listed(offer,'CT')||'0';
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState(null);
  const [modality,setModality]=useState('MRI');
  const [expanded,setExpanded]=useState(false);
  const [phone,setPhone]=useState(()=>matchMedia('(max-width:600px)').matches);
  const sequence=useRef(0);
  useEffect(()=>{const media=matchMedia('(max-width:600px)');const change=()=>setPhone(media.matches);media.addEventListener('change',change);return()=>{media.removeEventListener('change',change);sequence.current++;};},[]);
  useEffect(()=>{
    if(!ohio)return;
    if(!validZip(zip)&&!(ohio&&!zip)){setError('This center has no saved five-digit ZIP code. Hospital comparison is unavailable.');return;}
    const request=++sequence.current;setBusy(true);setError('');
    const params=new URLSearchParams({zip,mri,ct});
    if(!zip&&ohio){params.set('state','OH');params.set('city',city);if(latitude!==undefined&&longitude!==undefined){params.set('latitude',latitude);params.set('longitude',longitude);}}
    comparisonAPI(comparisonPath+'?'+params).then(data=>{if(request!==sequence.current)return;setResult(data);setModality(data.matches.MRI?'MRI':'CT');setExpanded(false);}).catch(error=>{if(request===sequence.current)setError(error.message);}).finally(()=>{if(request===sequence.current)setBusy(false);});
    return()=>{sequence.current++;};
  },[zip,mri,ct,ohio,city,latitude,longitude,comparisonAPI,comparisonPath]);
  const rows=(result?.hospitals||[]).filter(row=>row.prices[modality]);
  const threshold=result?.thresholds[modality];
  const ranges=hospitalRanges(rows.map(row=>({...row.prices[modality],self_pay_median:row.prices[modality].cash_price})));
  const knownDistances=rows.length>0&&rows.every(row=>Number.isFinite(row.distance_miles));
  const initialCount=phone?4:6;
  if(!ohio)return <section className="chr-screen"><section className="hospital-comparison" aria-labelledby="dialogTitle"><h2 id="dialogTitle">CHR index</h2><p role="status">Data for this state is not available at this moment.</p></section></section>;
  return <section className="chr-screen">
    <section className="hospital-comparison" aria-labelledby="dialogTitle">
      <div className="hc-heading"><div><h2 id="dialogTitle">Hospitals near you publish</h2><p>{result?`${result.hospital_count} hospital${result.hospital_count===1?'':'s'} within 50 miles of ZIP ${result.zip} have a lowest MRI or CT cash price above this center’s saved price.`:'Comparing hospital prices using this center’s saved ZIP code and prices.'}</p></div></div>
      {result?.zip_fallback&&<p className="hc-help">Using ZIP {result.zip}: {result.zip_basis}. The center has no saved ZIP code.</p>}
      {error&&<p role="alert" className="hc-error">{error}</p>}
      {busy&&<div className="hc-loading" role="status"><span className="hc-spinner" aria-hidden="true"/>Checking hospital prices…</div>}
      {!busy&&result&&<><div className="chr-tabs" role="group" aria-label="Compare imaging service">{['MRI','CT'].map(value=><button key={value} type="button" aria-pressed={modality===value} disabled={result.thresholds[value]===null} onClick={()=>{setModality(value);setExpanded(false);}}>{value}<span>{result.matches[value]}</span></button>)}</div>
      {rows.length>0?<><RangeChart ranges={ranges} facilityPrice={threshold>0?threshold:null}/><p className="hc-caveat">Hospital figures may not include the radiologist’s reading. This compares grouped noncontrast {modality} lowest cash prices with {threshold>0?`this center’s saved price of ${dollars(threshold)}`:'a $0 comparison threshold because this center has no saved price'}; it does not establish a quote for the same exact exam. Your own insured cost depends on your plan.</p><div className="hc-list-heading"><h3>Hospital by hospital{knownDistances?', nearest first':''}</h3>{expanded&&rows.length>initialCount&&<button type="button" className="hc-text-button" onClick={()=>setExpanded(false)}>Show fewer</button>}</div><table className="hc-hospital-table chr-hospital-table"><thead><tr><th>Hospital</th><th>Distance</th><th>Cash price</th><th>Gross charge</th><th>Insurer rates</th><th>Source</th></tr></thead><tbody>{rows.slice(0,expanded?rows.length:initialCount).map(row=>{const price=row.prices[modality],source=sourceOf(row);return <tr key={row.ccn}><th scope="row"><strong>{row.hospital_name}</strong></th><td className="chr-distance">{Number.isFinite(row.distance_miles)?`${row.distance_miles.toLocaleString('en-US',{maximumFractionDigits:1})} mi`:'—'}</td><td data-label="Cash">{dollars(price.cash_price)}<small className="chr-difference">+{dollars(price.difference)}</small></td><td data-label="Gross">{dollars(price.gross_charge)}</td><td data-label="Insurer">{rangeLabel([price.insured_min,price.insured_max].filter(value=>positive(value)!==null).length?[price.insured_min,price.insured_max]:[price.insured_median])}</td><td className="hc-source">{source?<a href={source} target="_blank" rel="noopener noreferrer">Price file<span className="sr-only"> for {row.hospital_name}</span></a>:'Not posted'}</td></tr>;})}</tbody></table>{rows.length>initialCount&& !expanded&&<button type="button" className="hc-button hc-show-all" onClick={()=>setExpanded(true)}>Show all {rows.length} hospitals</button>}<p className="hc-footnote">Distances are approximate straight-line miles from the ZIP’s reference point. Hospitals without a posted lowest cash price or whose lowest price is equal to or below the center’s comparison price are left out. One row per hospital; shared health-system price files may appear separately.</p></>:<div className="hc-empty"><h3>No higher-priced {modality} hospitals found</h3><p>No hospital within 50 miles of ZIP {result.zip} has a posted lowest {modality} cash price greater than the comparison threshold of {dollars(threshold)}.</p></div>}</>}
    </section>
  </section>;
}
