// Display only ZIP codes saved on the center, never the visitor's search ZIP.
export function cardLocation(offer) {
  const entry = offer.entry || {};
  const locations = offer.locations?.length ? offer.locations : (entry.locations || []);
  const zip5 = value => String(value || '').trim().match(/^(\d{5})(?:-\d{4})?$/)?.[1];
  const zip = locations.map(location => zip5(location.zip || location.zip_code || location.postal_code)).find(Boolean)
    || zip5(entry.zip || entry.zip_code || entry.postal_code)
    || String(entry.address || entry.coverage || '').match(/\b\d{5}(?:-\d{4})?\b/)?.[0]?.slice(0, 5);
  const region = String(offer.region || entry.area || entry.states || '').trim();
  return zip && !new RegExp(`\\b${zip}\\b`).test(region) ? `${region}${region ? ' ' : ''}(${zip})` : region;
}
