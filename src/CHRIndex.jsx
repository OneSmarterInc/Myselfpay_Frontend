import {californiaRanges,californiaPriceRange,californiaRangeLabel} from './california-ranges.js';
import {useEffect,useRef,useState} from 'react';
import {api} from './api.js';
import {chrLocation,isCalifornia,isDelaware,isVermont,isAlaska,isPennsylvania,isLouisiana,isMichigan,isHawaii,isColorado,isArkansas,isNewMexico,isIllinois,isIndiana,isAlabama,isKentucky,isNorthDakota,isRhodeIsland,isTennessee,isDistrictOfColumbia,isSouthDakota,isOklahoma,isMontana,isWisconsin,isIowa,isGeorgia,isAmericanSamoa,isConnecticut,isNebraska,isIdaho,isNewJersey,delawareLocation} from './chr-location.js';
import CaliforniaHospitalPrices from './CaliforniaHospitalPrices.jsx';
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
export default function CHRIndex(props){
 if(props.offer.chrProgram)return <><p className="hc-help">Hospital prices for your searched area. Program prices are starting prices; confirm the participating site and exact exam.</p><CHRIndex {...props} offer={{...props.offer,chrProgram:false}}/></>;
 if(isCalifornia(props.offer)||isDelaware(props.offer)||isVermont(props.offer)||isAlaska(props.offer)||isPennsylvania(props.offer)||isLouisiana(props.offer)||isMichigan(props.offer)||isHawaii(props.offer)||isColorado(props.offer)||isArkansas(props.offer)||isNewMexico(props.offer)||isIllinois(props.offer)||isIndiana(props.offer)||isAlabama(props.offer)||isKentucky(props.offer)||isNorthDakota(props.offer)||isRhodeIsland(props.offer)||isTennessee(props.offer)||isDistrictOfColumbia(props.offer)||isSouthDakota(props.offer)||isOklahoma(props.offer)||isWisconsin(props.offer)||isMontana(props.offer)||isIowa(props.offer)||isGeorgia(props.offer)||isAmericanSamoa(props.offer)||isConnecticut(props.offer)||isNebraska(props.offer)||isIdaho(props.offer)||isNewJersey(props.offer))return <CaliforniaHospitalPrices stateCode={isNewJersey(props.offer)?"NJ":isIdaho(props.offer)?"ID":isNebraska(props.offer)?"NE":isConnecticut(props.offer)?"CT":isAmericanSamoa(props.offer)?"AS":isGeorgia(props.offer)?"GA":isWisconsin(props.offer)?"WI":isIowa(props.offer)?"IA":isMontana(props.offer)?"MT":isOklahoma(props.offer)?"OK":isSouthDakota(props.offer)?"SD":isDistrictOfColumbia(props.offer)?"DC":isTennessee(props.offer)?"TN":isRhodeIsland(props.offer)?"RI":isNorthDakota(props.offer)?"ND":isKentucky(props.offer)?"KY":isAlabama(props.offer)?"AL":isIndiana(props.offer)?"IN":isIllinois(props.offer)?"IL":isNewMexico(props.offer)?"NM":isArkansas(props.offer)?"AR":isColorado(props.offer)?"CO":isHawaii(props.offer)?"HI":isMichigan(props.offer)?"MI":isLouisiana(props.offer)?"LA":isPennsylvania(props.offer)?"PA":isAlaska(props.offer)?"AK":isVermont(props.offer)?"VT":isDelaware(props.offer)?"DE":"CA"} comparisonAPI={props.comparisonAPI||api} comparisonPath={props.comparisonPath||'/chr-index'} mri={listed(props.offer,'MRI')} ct={listed(props.offer,'CT')}/>;
 return <OhioCHRIndex {...props} delaware={isDelaware(props.offer)}/>;
}
function OhioCHRIndex({offer,comparisonAPI=api,comparisonPath="/chr-index",delaware=false}){
  const zip=initialZip(offer.entry);
  const {ohio,city,latitude,longitude}=delaware?{ohio:true,...delawareLocation(offer)}:chrLocation(offer);
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
    const params=new URLSearchParams({zip,mri,ct,view:"filtered"});
    if(delaware)params.set('state','DE');
    if(!zip&&ohio){params.set('state',delaware?'DE':'OH');params.set('city',city);if(latitude!==undefined&&longitude!==undefined){params.set('latitude',latitude);params.set('longitude',longitude);}}
    comparisonAPI(comparisonPath+'?'+params).then(data=>{if(request!==sequence.current)return;setResult(data);setModality(data.matches.MRI?'MRI':'CT');setExpanded(false);}).catch(error=>{if(request===sequence.current)setError(error.message);}).finally(()=>{if(request===sequence.current)setBusy(false);});
    return()=>{sequence.current++;};
  },[zip,mri,ct,ohio,city,latitude,longitude,comparisonAPI,comparisonPath,delaware]);
  const rows=(result?.hospitals||[]).filter(row=>row.prices[modality]);
  const threshold=result?.thresholds[modality];
  const ranges=californiaRanges(rows.map(row=>{const p=row.prices[modality];return {cash_min:p.self_pay_min,cash_max:p.self_pay_max,gross_min:p.gross_min,gross_max:p.gross_charge,insured_min:p.insured_min,insured_max:p.insured_max}}));
  const knownDistances=rows.length>0&&rows.every(row=>Number.isFinite(row.distance_miles));
  const initialCount=phone?4:6;
  if(!ohio)return <section className="chr-screen"><section className="hospital-comparison" aria-labelledby="dialogTitle"><h2 id="dialogTitle">CHR index</h2><p role="status">Data for this state is not available at this moment.</p></section></section>;
  return <section className="chr-screen">
    <section className="hospital-comparison" aria-labelledby="dialogTitle">
      <div className="hc-heading"><div><h2 id="dialogTitle">Hospitals near you publish</h2><p>{result?`${result.hospital_count} hospital${result.hospital_count===1?'':'s'} within 50 miles of ZIP ${result.zip} have qualifying cash, gross, and insurer ranges above the comparison threshold.`:'Comparing hospital prices using this center’s saved ZIP code and prices.'}</p></div></div>
      {result?.zip_fallback&&<p className="hc-help">Using ZIP {result.zip}: {result.zip_basis}. The center has no saved ZIP code.</p>}
      {error&&<p role="alert" className="hc-error">{error}</p>}
      {busy&&<div className="hc-loading" role="status"><span className="hc-spinner" aria-hidden="true"/>Checking hospital prices…</div>}
      {!busy&&result&&<><div className="chr-tabs" role="group" aria-label="Compare imaging service">{['MRI','CT'].map(value=><button key={value} type="button" aria-pressed={modality===value} disabled={result.thresholds[value]===null} onClick={()=>{setModality(value);setExpanded(false);}}>{value}<span>{result.matches[value]}</span></button>)}</div>
      {rows.length>0?<><RangeChart ranges={ranges} facilityPrice={threshold>0?threshold:null} formatRange={californiaRangeLabel} markerLabel={result.threshold_basis==='Default'?'Threshold':'This facility'}/><p className="hc-caveat">{delaware&&<>{result.price_basis} </>}Hospital figures may not include the radiologist’s reading. This compares grouped noncontrast {modality} lowest cash prices with {threshold>0?`the ${result.threshold_basis||'center'} threshold of ${dollars(threshold)}`:'the default $100 threshold'}; it does not establish a quote for the same exact exam. Your own insured cost depends on your plan.</p><div className="hc-list-heading"><h3>Hospital by hospital{knownDistances?', nearest first':''}</h3>{expanded&&rows.length>initialCount&&<button type="button" className="hc-text-button" onClick={()=>setExpanded(false)}>Show fewer</button>}</div><table className="hc-hospital-table chr-hospital-table"><thead><tr><th>Hospital</th><th>Cash price</th><th>Gross charge</th><th>Insurer rates</th>{!delaware&&<th>Source</th>}</tr></thead><tbody>{rows.slice(0,expanded?rows.length:initialCount).map(row=>{const price=row.prices[modality],source=sourceOf(row);return <tr key={row.id||row.ccn}><th scope="row"><strong>{row.hospital_name}</strong></th><td data-label="Cash">{californiaPriceRange(price.self_pay_min,price.self_pay_max)}<small className="chr-difference">+{dollars(price.difference)}</small></td><td data-label="Gross">{californiaPriceRange(price.gross_min,price.gross_charge)}</td><td data-label="Insurer">{rangeLabel([price.insured_min,price.insured_max].filter(value=>positive(value)!==null).length?[price.insured_min,price.insured_max]:[price.insured_median])}</td>{!delaware&&<td className="hc-source">{source?<a href={source} target="_blank" rel="noopener noreferrer">Price file<span className="sr-only"> for {row.hospital_name}</span></a>:'Not posted'}</td>}</tr>;})}</tbody></table>{rows.length>initialCount&& !expanded&&<button type="button" className="hc-button hc-show-all" onClick={()=>setExpanded(true)}>Show all {rows.length} hospitals</button>}<p className="hc-footnote">Distances are approximate straight-line miles from the ZIP’s reference point. Each lower bound is the lowest stored value strictly above the MRI price, otherwise CT price, otherwise $100. Upper bounds are unchanged. Hospitals missing any qualifying range are left out. One row per hospital; shared health-system price files may appear separately.</p></>:<div className="hc-empty"><h3>No higher-priced {modality} hospitals found</h3><p>No hospital within 50 miles of ZIP {result.zip} has a posted lowest {modality} cash price greater than the comparison threshold of {dollars(threshold)}.</p></div>}</>}
    </section>
  </section>;
}
