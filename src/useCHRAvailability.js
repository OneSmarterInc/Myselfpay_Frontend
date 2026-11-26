import {useEffect,useState} from 'react';
import {api} from './api.js';
import {programCHRContext} from './chr-location.js';
import {chrAvailabilityQuery} from './chr-availability.js';
export function useCHRAvailability(offers,context,refreshKey){
 const [status,setStatus]=useState({});
 useEffect(()=>{
  let active=true;
  const ids=[...new Set([...document.querySelectorAll('button[data-chr]')].map(b=>b.dataset.chr))];
  const items=[],next={};
  for(const id of ids){const offer=offers.find(o=>o.id===id);if(!offer)continue;const query=chrAvailabilityQuery(programCHRContext(offer,context));if(!query)next[id]=false;else {next[id]='checking';items.push({id,query});}}
  setStatus(next);
  async function check(){
   for(let start=0;start<items.length&&active;start+=24){
    const batch=items.slice(start,start+24);
    try{const data=await api('/chr-index/availability',{items:batch});if(active)setStatus(old=>{const updated={...old};for(const item of batch)updated[item.id]=null;for(const row of data.results||[])if(batch.some(item=>item.id===row.id))updated[row.id]=row.available;return updated;});}
    catch{if(active)setStatus(old=>({...old,...Object.fromEntries(batch.map(item=>[item.id,null]))}));}
   }
  }
  check();return()=>{active=false};
 },[offers,context,refreshKey]);
 return status;
}
