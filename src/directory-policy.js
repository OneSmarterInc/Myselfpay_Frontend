// Preserve centers, prices, booking IDs and source links. Only display branding changes.
const identityFields = new Set(['id','booking_id','entry_key','version','source','additional','website','url','source_url','source_urls']);
export function presentListing(value, key = '') {
  if (Array.isArray(value)) return value.map(item => presentListing(item, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name,item]) => [name,presentListing(item,name)]));
  if (typeof value !== 'string' || identityFields.has(key) || /^https?:\/\//i.test(value)) return value;
  return value.replace(/\bmd[\s-]*save\b/gi,'marketplace').replace(/\bmarketplace\s+marketplace\b/gi,'marketplace');
}
export function visibleDirectoryData(data) {
  const result = { ...data };
  for (const key of ['entries','offers','programs','program_entries','nearby_unpriced','records']) {
    if (Array.isArray(data[key])) result[key] = data[key].map(item => presentListing(item));
  }
  return result;
}
