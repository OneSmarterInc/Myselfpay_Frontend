// Resolve a saved center location, including multi-state directory entries.
export function chrLocation(offer) {
  const entry=offer.entry||{};
  const locations=offer.locations?.length?offer.locations:(entry.locations||[]);
  const isOhio=value=>/^(OH|OHIO)$/i.test(String(value||'').trim());
  const ohioLocation=locations.find(item=>isOhio(item.state));
  const states=String(entry.states||'').split(/[;,|/]/).map(value=>value.trim());
  const ohio=Boolean(ohioLocation)||states.some(isOhio);
  const location=ohioLocation||locations[0];
  const latitude=Number(location?.latitude),longitude=Number(location?.longitude);
  const hasCoordinates=location?.latitude!=null&&location?.longitude!=null&&Number.isFinite(latitude)&&Number.isFinite(longitude);
  return {ohio,city:String(location?.city||entry.area||'').split(/[;,]/)[0].trim(),
    latitude:hasCoordinates?latitude:undefined,longitude:hasCoordinates?longitude:undefined};
}

export function isCalifornia(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:CA|California)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:CA|California)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isDelaware(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:DE|Delaware)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:DE|Delaware)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function delawareLocation(offer){
 const entry=offer.entry||{},locations=offer.locations?.length?offer.locations:(entry.locations||[]);
 const location=locations.find(row=>/^(DE|Delaware)$/i.test(String(row.state||row.state_code||'').trim()))||locations.find(row=>!row.state&&!row.state_code);
 const latitude=Number(location?.latitude),longitude=Number(location?.longitude);
 const valid=location?.latitude!=null&&location?.longitude!=null&&Number.isFinite(latitude)&&Number.isFinite(longitude);
 return {city:String(location?.city||entry.area||'').split(/[;,]/)[0].trim(),latitude:valid?latitude:undefined,longitude:valid?longitude:undefined};
}

export function isVermont(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:VT|Vermont)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:VT|Vermont)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isAlaska(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:AK|Alaska)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:AK|Alaska)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isPennsylvania(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:PA|Pennsylvania)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:PA|Pennsylvania)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isLouisiana(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:LA|Louisiana)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:LA|Louisiana)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

// Programs have no single facility address; scope only their CHR view to the search.
export function programCHRContext(offer, location) {
 if (offer.entry?.location_type !== 'program' || !/^[A-Z]{2}$/.test(location?.state||'')) return offer;
 const zip=String(location.zip||location.zip_code||'');
 const scoped={state:location.state,city:location.city||'',latitude:location.latitude,longitude:location.longitude};
 if (/^\d{5}$/.test(zip)) scoped.zip=zip;
 return {...offer,chrProgram:true,locations:[scoped],entry:{...offer.entry,states:location.state,state:location.state,zip:scoped.zip||'',zip_code:'',coverage:'',locations:[scoped]}};
}

export function isMichigan(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:MI|Michigan)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:MI|Michigan)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isHawaii(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:HI|Hawaii)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:HI|Hawaii)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isColorado(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:CO|Colorado)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:CO|Colorado)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isArkansas(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:AR|Arkansas)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:AR|Arkansas)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isNewMexico(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:NM|New Mexico)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:NM|New Mexico)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isIllinois(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:IL|Illinois)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:IL|Illinois)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isIndiana(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:IN|Indiana)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:IN|Indiana)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isAlabama(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:AL|Alabama)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:AL|Alabama)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}
