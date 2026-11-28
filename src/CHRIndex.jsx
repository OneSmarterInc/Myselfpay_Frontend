import {ohioHospitalRows,ohioHospitalSummary} from './ohio-ranges.js';
import {californiaRanges,californiaPriceRange,californiaRangeLabel} from './california-ranges.js';
import {useEffect,useRef,useState} from 'react';
import {api} from './api.js';
import {chrLocation,isCalifornia,isDelaware,isVermont,isAlaska,isPennsylvania,isLouisiana,isMichigan,isHawaii,isColorado,isArkansas,isNewMexico,isIllinois,isIndiana,isAlabama,isKentucky,isNorthDakota,isRhodeIsland,isTennessee,isDistrictOfColumbia,isSouthDakota,isOklahoma,isMontana,isWisconsin,isIowa,isGeorgia,isAmericanSamoa,isConnecticut,isNebraska,isIdaho,isNewJersey,isSouthCarolina,isPuertoRico,isVirginia,isNewHampshire,isWashington,isNewYork,isOregon,isMaine,isArizona,isMississippi,isMassachusetts,isMinnesota,isNevada,isGuam,delawareLocation} from './chr-location.js';
import CaliforniaHospitalPrices from './CaliforniaHospitalPrices.jsx';
import {cardPriceSummary,directoryOffer,highestDisplayedPrice} from './directory-offer.js';
import {RangeChart} from './HospitalComparison.jsx';
import {dollars,hospitalRanges,initialZip,positive,rangeLabel,validZip} from './imaging-prices.js';
import './chr-index.css';

function listed(offer,modality){
  if(offer?.mod===modality&&positive(offer.amount)!==null)return String(offer.amount);
  const line=(cardPriceSummary(directoryOffer(offer.entry))||'').split('\n').find(value=>new RegExp('^'+modality+'(?:\\s|:)').test(value));
  return line?.match(/\$([\d,]+(?:\.\d+)?)/)?.[1]?.replaceAll(',','')||'';
}
export default function CHRIndex(props){
 if(props.offer.chrProgram)return <CHRIndex {...props} offer={{...props.offer,chrProgram:false}}/>;
 if(isGuam(props.offer)||isNevada(props.offer)||isMinnesota(props.offer)||isMassachusetts(props.offer)||isMississippi(props.offer)||isArizona(props.offer)||isCalifornia(props.offer)||isDelaware(props.offer)||isVermont(props.offer)||isAlaska(props.offer)||isPennsylvania(props.offer)||isLouisiana(props.offer)||isMichigan(props.offer)||isHawaii(props.offer)||isColorado(props.offer)||isArkansas(props.offer)||isNewMexico(props.offer)||isIllinois(props.offer)||isIndiana(props.offer)||isAlabama(props.offer)||isKentucky(props.offer)||isNorthDakota(props.offer)||isRhodeIsland(props.offer)||isTennessee(props.offer)||isDistrictOfColumbia(props.offer)||isSouthDakota(props.offer)||isOklahoma(props.offer)||isWisconsin(props.offer)||isMontana(props.offer)||isIowa(props.offer)||isGeorgia(props.offer)||isAmericanSamoa(props.offer)||isConnecticut(props.offer)||isNebraska(props.offer)||isIdaho(props.offer)||isNewJersey(props.offer)||isSouthCarolina(props.offer)||isPuertoRico(props.offer)||isVirginia(props.offer)||isNewHampshire(props.offer)||isWashington(props.offer)||isNewYork(props.offer)||isOregon(props.offer)||isMaine(props.offer))return <CaliforniaHospitalPrices stateCode={isGuam(props.offer)?"GU":isNevada(props.offer)?"NV":isMinnesota(props.offer)?"MN":isMassachusetts(props.offer)?"MA":isMississippi(props.offer)?"MS":isArizona(props.offer)?"AZ":isMaine(props.offer)?"ME":isOregon(props.offer)?"OR":isNewYork(props.offer)?"NY":isWashington(props.offer)?"WA":isNewHampshire(props.offer)?"NH":isVirginia(props.offer)?"VA":isPuertoRico(props.offer)?"PR":isSouthCarolina(props.offer)?"SC":isNewJersey(props.offer)?"NJ":isIdaho(props.offer)?"ID":isNebraska(props.offer)?"NE":isConnecticut(props.offer)?"CT":isAmericanSamoa(props.offer)?"AS":isGeorgia(props.offer)?"GA":isWisconsin(props.offer)?"WI":isIowa(props.offer)?"IA":isMontana(props.offer)?"MT":isOklahoma(props.offer)?"OK":isSouthDakota(props.offer)?"SD":isDistrictOfColumbia(props.offer)?"DC":isTennessee(props.offer)?"TN":isRhodeIsland(props.offer)?"RI":isNorthDakota(props.offer)?"ND":isKentucky(props.offer)?"KY":isAlabama(props.offer)?"AL":isIndiana(props.offer)?"IN":isIllinois(props.offer)?"IL":isNewMexico(props.offer)?"NM":isArkansas(props.offer)?"AR":isColorado(props.offer)?"CO":isHawaii(props.offer)?"HI":isMichigan(props.offer)?"MI":isLouisiana(props.offer)?"LA":isPennsylvania(props.offer)?"PA":isAlaska(props.offer)?"AK":isVermont(props.offer)?"VT":isDelaware(props.offer)?"DE":"CA"} comparisonAPI={props.comparisonAPI||api} comparisonPath={props.comparisonPath||'/chr-index'} mri={listed(props.offer,'MRI')} ct={listed(props.offer,'CT')} threshold={highestDisplayedPrice(props.offer)}/>;
 return <OhioCHRIndex {...props} delaware={isDelaware(props.offer)}/>;
}
function OhioCHRIndex({offer,comparisonAPI=api,comparisonPath="/chr-index",delaware=false}){
  const zip=initialZip(offer.entry);
  const {ohio,city,latitude,longitude}=delaware?{ohio:true,...delawareLocation(offer)}:chrLocation(offer);
  const mri=listed(offer,'MRI')||'0';
  const ct=listed(offer,'CT')||'0';
  const referencePrice=highestDisplayedPrice(offer)||100;
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState(null);
  const [expanded,setExpanded]=useState(false);
  const [phone,setPhone]=useState(()=>matchMedia('(max-width:600px)').matches);
  const sequence=useRef(0);
  useEffect(()=>{const media=matchMedia('(max-width:600px)');const change=()=>setPhone(media.matches);media.addEventListener('change',change);return()=>{media.removeEventListener('change',change);sequence.current++;};},[]);
  useEffect(()=>{
    if(!ohio)return;
    if(!validZip(zip)&&!(ohio&&!zip)){setError('This center has no saved five-digit ZIP code. Hospital comparison is unavailable.');return;}
    const request=++sequence.current;setBusy(true);setError('');
    const params=new URLSearchParams({zip,mri,ct,threshold:String(referencePrice),view:"filtered"});
    if(delaware)params.set('state','DE');
    if(!zip&&ohio){params.set('state',delaware?'DE':'OH');params.set('city',city);if(latitude!==undefined&&longitude!==undefined){params.set('latitude',latitude);params.set('longitude',longitude);}}
    comparisonAPI(comparisonPath+'?'+params).then(data=>{if(request!==sequence.current)return;setResult(data);setExpanded(false);}).catch(error=>{if(request===sequence.current)setError(error.message);}).finally(()=>{if(request===sequence.current)setBusy(false);});
    return()=>{sequence.current++;};
  },[zip,mri,ct,referencePrice,ohio,city,latitude,longitude,comparisonAPI,comparisonPath,delaware]);
  const rows=ohioHospitalRows(result?.hospitals||[]);
  const threshold=Math.max(...Object.values(result?.thresholds||{}).filter(value=>Number.isFinite(value)&&value>0),referencePrice);
  const ranges=californiaRanges(rows.map(row=>{const p=row.prices.Combined;return {cash_min:p.self_pay_min,cash_max:p.self_pay_max,gross_min:p.gross_min,gross_max:p.gross_charge,insured_min:p.insured_min,insured_max:p.insured_max}}));
  const initialCount=phone?4:6;
  if(!ohio)return <section className="chr-screen"><section className="hospital-comparison" aria-labelledby="dialogTitle"><h2 id="dialogTitle">CHR index</h2><p role="status">Data for this state is not available at this moment.</p></section></section>;
  return <section className="chr-screen">
    <section className="hospital-comparison" aria-labelledby="dialogTitle">
      <div className="hc-heading"><div><h2 id="dialogTitle">Hospitals in Ohio publish</h2><p>{result?ohioHospitalSummary(rows):'Loading Ohio hospital prices.'}</p></div></div>
      {error&&<p role="alert" className="hc-error">{error}</p>}
      {busy&&<div className="hc-loading" role="status"><span className="hc-spinner" aria-hidden="true"/>Checking hospital prices…</div>}
      {!busy&&result&&<>
      {rows.length>0?<><RangeChart ranges={ranges} facilityPrice={threshold>0?threshold:null} formatRange={californiaRangeLabel} markerLabel={result.threshold_basis==='Default'?'Threshold':'This facility'}/><div className="hc-list-heading"><h3>Hospital by hospital</h3>{expanded&&rows.length>initialCount&&<button type="button" className="hc-text-button" onClick={()=>setExpanded(false)}>Show fewer</button>}</div><table className="hc-hospital-table chr-hospital-table"><thead><tr><th>Hospital</th><th>Cash price</th><th>Gross charge</th><th>Insurer rates</th></tr></thead><tbody>{rows.slice(0,expanded?rows.length:initialCount).map(row=>{const price=row.prices.Combined;return <tr key={row.id||row.ccn}><th scope="row"><strong>{row.hospital_name}</strong></th><td data-label="Cash">{californiaPriceRange(price.self_pay_min,price.self_pay_max)}</td><td data-label="Gross">{californiaPriceRange(price.gross_min,price.gross_charge)}</td><td data-label="Insurer">{californiaPriceRange(price.insured_min,price.insured_max)}</td></tr>;})}</tbody></table>{rows.length>initialCount&& !expanded&&<button type="button" className="hc-button hc-show-all" onClick={()=>setExpanded(true)}>Show all {rows.length} hospitals</button>}</>:<div className="hc-empty"><h3>No qualifying hospital prices found</h3><p>No hospital ranges match this facility’s comparison threshold.</p></div>}</>}
    </section>
  </section>;
}
