import {useEffect,useState} from 'react';
import {RangeChart} from './HospitalComparison.jsx';
import {dollars} from './imaging-prices.js';
import {californiaRanges,californiaPriceRange,californiaReference,californiaRangeLabel} from './california-ranges.js';
export default function CaliforniaHospitalPrices({comparisonAPI,comparisonPath,mri,ct,stateCode="CA"}){
 const stateName=stateCode==="MT"?"Montana":stateCode==="OK"?"Oklahoma":stateCode==="SD"?"South Dakota":stateCode==="DC"?"District of Columbia":stateCode==="TN"?"Tennessee":stateCode==="RI"?"Rhode Island":stateCode==="ND"?"North Dakota":stateCode==="KY"?"Kentucky":stateCode==="AL"?"Alabama":stateCode==="IN"?"Indiana":stateCode==="IL"?"Illinois":stateCode==="NM"?"New Mexico":stateCode==="AR"?"Arkansas":stateCode==="CO"?"Colorado":stateCode==="HI"?"Hawaii":stateCode==="MI"?"Michigan":stateCode==="LA"?"Louisiana":stateCode==="PA"?"Pennsylvania":stateCode==="AK"?"Alaska":stateCode==="VT"?"Vermont":stateCode==="DE"?"Delaware":"California";
 const [state,setState]=useState({loading:true,data:null,error:''}),[retry,setRetry]=useState(0),[expanded,setExpanded]=useState(false);

 const [phone,setPhone]=useState(()=>matchMedia('(max-width:600px)').matches);
 useEffect(()=>{const media=matchMedia('(max-width:600px)');const change=()=>setPhone(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change)},[]);
 useEffect(()=>{let active=true;setState({loading:true,data:null,error:''});setExpanded(false);
  comparisonAPI(comparisonPath+'?'+new URLSearchParams({state:stateCode,view:'hospitals',mri:mri||'',ct:ct||''})).then(data=>{if(!Array.isArray(data.hospitals)||!Number.isFinite(data.source_records))throw new Error('Hospital price ranges are temporarily unavailable. Please try again shortly.');if(active)setState({loading:false,data,error:''})}).catch(error=>{if(active)setState({loading:false,data:null,error:error.message})});
  return()=>{active=false};
 },[comparisonAPI,comparisonPath,retry,stateCode,mri,ct]);
 const rows=state.data?.hospitals||[],ranges=californiaRanges(rows),initialCount=phone?4:6;
 const reference=californiaReference(mri)??californiaReference(ct)??100;
 const basis=californiaReference(mri)!==null?'MRI':californiaReference(ct)!==null?'CT':'Default';
 return <section className="chr-screen"><section className="hospital-comparison" aria-labelledby="ca-hospital-heading">
  <div className="hc-heading"><div><h2 id="ca-hospital-heading">Hospitals in {stateName} publish</h2><p>{state.data?`${state.data.hospital_count} hospitals in ${stateName} have ${state.data.source_records.toLocaleString('en-US')} source price records.`:`Loading ${stateName} hospital prices.`} Statewide hospital prices.</p></div></div>
  {state.loading&&<div className="hc-loading" role="status"><span className="hc-spinner" aria-hidden="true"/>Checking hospital prices...</div>}
  {state.error&&<div role="alert"><p className="hc-error">{state.error}</p><button className="hc-button" onClick={()=>setRetry(value=>value+1)}>Retry</button></div>}
  {!state.loading&&state.data&&<>
   <p className="hc-help">{basis==='Default'?'Default threshold':`Center ${basis} threshold`}: {dollars(reference)}. All three range minimums must be strictly higher.</p>
   {rows.length?<><RangeChart ranges={ranges} facilityPrice={reference} markerLabel={basis==='Default'?'Threshold':'This facility'} formatRange={californiaRangeLabel}/><p className="hc-caveat">Hospital ranges combine the imaging rows supplied in the {stateName} file. These statewide ranges combine source rows across exams. Lower bounds use only stored values above the MRI, CT, or default threshold; upper bounds remain unchanged. Hospitals missing a qualifying value in any range are excluded. The center price is a reference marker; these ranges do not establish a quote for the same exam. Confirm the exact exam and all-in price with the hospital.</p>
    <div className="hc-list-heading"><h3>Hospital by hospital</h3>{expanded&&rows.length>initialCount&&<button type="button" className="hc-text-button" onClick={()=>setExpanded(false)}>Show fewer</button>}</div>
    <table className="hc-hospital-table chr-hospital-table"><thead><tr><th>Hospital</th><th>Cash price</th><th>Gross charge</th><th>Insurer rates</th></tr></thead><tbody>{rows.slice(0,expanded?rows.length:initialCount).map(row=><tr key={row.hospital_name}><th scope="row"><strong>{row.hospital_name}</strong></th><td data-label="Cash">{californiaPriceRange(row.cash_min,row.cash_max)}</td><td data-label="Gross">{californiaPriceRange(row.gross_min,row.gross_max)}</td><td data-label="Insurer">{californiaPriceRange(row.insured_min,row.insured_max)}</td></tr>)}</tbody></table>
    {rows.length>initialCount&&!expanded&&<button type="button" className="hc-button hc-show-all" onClick={()=>setExpanded(true)}>Show all {rows.length} hospitals</button>}
   </>:<div className="hc-empty"><h3>No {stateName} hospital prices found</h3></div>}
   <p className="hc-footnote">Ranges are grouped by hospital name from the imported {stateName} CSV. Exam-specific comparisons are unavailable in this source. Missing values are not treated as zero.</p>
  </>}
 </section></section>;
}
