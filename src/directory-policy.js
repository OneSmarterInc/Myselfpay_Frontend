// Do not render excluded marketplace listings from stale API or spatial responses.
export function excludedListing(value) {
  return /md[\s-]*save/i.test(JSON.stringify(value ?? ''));
}

export function visibleDirectoryData(data) {
  const result = { ...data };
  for (const key of ['entries', 'offers', 'programs', 'program_entries', 'nearby_unpriced', 'records']) {
    if (Array.isArray(data[key])) result[key] = data[key].filter(item => !excludedListing(item));
  }
  return result;
}
