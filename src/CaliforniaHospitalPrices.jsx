import {useEffect,useState} from 'react';
import './california-prices.css';
const dollars=value=>value===null||value===undefined?'Not provided':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:6}).format(Number(value));
export default function CaliforniaHospitalPrices({comparisonAPI,comparisonPath}){
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(1),[size,setSize]=useState(20),[retry,setRetry]=useState(0);
 const [state,setState]=useState({loading:true,data:null,error:''});
 useEffect(()=>{const timer=setTimeout(()=>{setQuery(search);setPage(1)},250);return()=>clearTimeout(timer)},[search]);
 useEffect(()=>{let active=true;setState({loading:true,data:null,error:''});
  comparisonAPI(comparisonPath+'?'+new URLSearchParams({state:'CA',search:query,page:String(page),page_size:String(size)})).then(data=>{if(active)setState({loading:false,data,error:''})}).catch(error=>{if(active)setState({loading:false,data:null,error:error.message})});
  return()=>{active=false};
 },[comparisonAPI,comparisonPath,query,page,size,retry]);
 const pages=Math.max(1,Math.ceil((state.data?.count||0)/size));
 return <section className="ca-hospital-prices" aria-label="California hospital imaging prices"><h2>California hospital imaging prices</h2><p className="ca-price-note">Statewide source records. Exam types, ZIP codes and distances were not supplied. Confirm the exact exam and price with the hospital.</p>
 <div className="ca-price-filters"><label>Search hospitals<input type="search" placeholder="Hospital name" value={search} onChange={event=>setSearch(event.target.value)}/></label><label>Rows per page<select value={size} onChange={event=>{setSize(Number(event.target.value));setPage(1)}}><option>10</option><option>20</option><option>50</option></select></label></div>
 {state.loading?<p role="status">Loading California prices...</p>:state.error?<div role="alert"><p>{state.error}</p><button onClick={()=>setRetry(value=>value+1)}>Retry</button></div>:<><p className="ca-price-note">{state.data.hospital_count.toLocaleString('en-US')} {state.data.hospital_count===1?'hospital':'hospitals'} · {state.data.count.toLocaleString('en-US')} source records</p>
 {state.data.results.length?<table className="ca-prices-table"><thead><tr><th>Hospital</th><th>State</th><th>Distance</th><th>Cash price</th><th>Gross charge</th><th>Insurer rates</th></tr></thead><tbody>{state.data.results.map(row=><tr key={row.id}><td data-label="Hospital"><strong>{row.hospital}</strong></td><td data-label="State">{row.state}</td><td data-label="Distance">{row.distance_miles===null?'Not provided':`${row.distance_miles} miles`}</td><td data-label="Cash price">{dollars(row.cash_price)}</td><td data-label="Gross charge">{dollars(row.gross_charge)}</td><td data-label="Insurer rates">{row.insurer_rates||'Not provided'}</td></tr>)}</tbody></table>:<p>No hospital records match your search.</p>}
 <div className="ca-price-pagination"><span>{state.data.count?(page-1)*size+1:0}–{Math.min(page*size,state.data.count)} of {state.data.count.toLocaleString('en-US')} records</span>{pages>1&&<div><button disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Previous</button><span>Page {page} of {pages}</span><button disabled={page>=pages} onClick={()=>setPage(value=>value+1)}>Next</button></div>}</div></>}
 <p className="ca-price-note">Source: CA Hospital Imaging Prices CSV. Rows are preserved as supplied, including repeated prices. Unavailable values are not treated as zero.</p></section>;
}
