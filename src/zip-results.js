export function searchZip(location) {
  return String(location || '').match(/^\s*(\d{5})(?:-\d{4})?(?:\s*,\s*[A-Za-z ]+)?\s*$/)?.[1] || '';
}
export function centerZips(offer) {
  const entry=offer.entry || {};
  const locations=offer.locations?.length ? offer.locations : (entry.locations || []);
  const values=[...locations.map(l=>l.zip || l.zip_code || l.postal_code),entry.zip,entry.zip_code,entry.postal_code];
  const saved=values.map(v=>String(v || '').match(/^(\d{5})(?:-\d{4})?$/)?.[1]).filter(Boolean);
  const text=[entry.address,entry.coverage,offer.region].filter(Boolean).join(' ');
  return [...new Set([...saved,...[...text.matchAll(/\b(\d{5})(?:-\d{4})?\b/g)].map(m=>m[1])])];
}
export function arrangeZipResults(offers,location) {
  const zip=searchZip(location);
  if(!zip)return {offers,zip:'',exact:false};
  const exact=offer=>centerZips(offer).includes(zip);
  const distance=offer=>Number.isFinite(offer.distance_miles)?offer.distance_miles:Infinity;
  const sorted=[...offers].sort((a,b)=>Number(exact(b))-Number(exact(a)) || (distance(a)<distance(b)?-1:distance(a)>distance(b)?1:0));
  return {offers:sorted,zip,exact:offers.some(exact)};
}
