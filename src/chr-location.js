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

export function isKentucky(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:KY|Kentucky)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:KY|Kentucky)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isNorthDakota(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:ND|North Dakota)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:ND|North Dakota)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isRhodeIsland(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:RI|Rhode Island)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:RI|Rhode Island)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isTennessee(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:TN|Tennessee)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:TN|Tennessee)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isDistrictOfColumbia(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:DC|District of Columbia)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:DC|District of Columbia)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isSouthDakota(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:SD|South Dakota)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:SD|South Dakota)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isOklahoma(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:OK|Oklahoma)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:OK|Oklahoma)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isMontana(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:MT|Montana)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:MT|Montana)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isIowa(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:IA|Iowa)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:IA|Iowa)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isWisconsin(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:WI|Wisconsin)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:WI|Wisconsin)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isGeorgia(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:GA|Georgia)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:GA|Georgia)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isAmericanSamoa(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:AS|American Samoa)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:AS|American Samoa)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isConnecticut(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:CT|Connecticut)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:CT|Connecticut)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isNebraska(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:NE|Nebraska)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:NE|Nebraska)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isIdaho(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:ID|Idaho)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:ID|Idaho)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isNewJersey(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:NJ|New Jersey)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:NJ|New Jersey)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isSouthCarolina(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:SC|South Carolina)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:SC|South Carolina)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isPuertoRico(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:PR|Puerto Rico)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:PR|Puerto Rico)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isVirginia(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:VA|Virginia)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:VA|Virginia)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isNewHampshire(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:NH|New Hampshire)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:NH|New Hampshire)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isWashington(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:WA|Washington)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 if([offer.region,entry.area,entry.address].some(value=>/\b(?:DC|District of Columbia)\b/i.test(String(value||''))))return false;
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:WA|Washington)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isNewYork(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:NY|New York)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:NY|New York)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isOregon(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:OR|Oregon)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:OR|Oregon)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isMaine(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:ME|Maine)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:ME|Maine)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isArizona(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:AZ|Arizona)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:AZ|Arizona)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isMississippi(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:MS|Mississippi)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:MS|Mississippi)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isMassachusetts(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:MA|Massachusetts)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:MA|Massachusetts)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isMinnesota(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:MN|Minnesota)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:MN|Minnesota)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isNevada(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:NV|Nevada)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:NV|Nevada)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isGuam(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:GU|Guam)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:GU|Guam)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isVirginIslands(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:VI|(?:US\s+|U\.S\.\s+|United States\s+)?Virgin Islands)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:VI|(?:US\s+|U\.S\.\s+|United States\s+)?Virgin Islands)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isWyoming(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:WY|Wyoming)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:WY|Wyoming)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isMaryland(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:MD|Maryland)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:MD|Maryland)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isKansas(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:KS|Kansas)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:KS|Kansas)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}

export function isWestVirginia(offer) {
 const entry=offer.entry||{};
 const stateOf=location=>location.state||location.state_code||location.stateCode;
 const populated=values=>values.map(value=>String(value||'').trim()).filter(Boolean);
 const matches=values=>values.some(value=>/\b(?:WV|West Virginia)\b/i.test(value));
 // A known scoped state takes precedence. A partial location must not erase
 // the center's saved state merely because its state property is missing.
 const scoped=populated((offer.locations||[]).map(stateOf));
 if(scoped.length)return matches(scoped);
 const saved=populated([entry.states,entry.state,...(entry.locations||[]).map(stateOf)]);
 if(saved.length)return matches(saved);
 // Legacy cards sometimes carry state only in a city/state label.
 return [offer.region,entry.area,entry.address].some(value=>/(?:^|[,;|/])\s*(?:WV|West Virginia)(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,;|/])/i.test(String(value||'')));
}
