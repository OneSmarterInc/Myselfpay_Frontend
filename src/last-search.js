// Keeps the last search so Back to results can rebuild it after a page load.
const KEY = "msp-last-search";
export function saveLastSearch(search) {
  try {
    if (search && typeof search === "object") sessionStorage.setItem(KEY, JSON.stringify(search));
  } catch {
    /* storage can be unavailable; Back to results then opens a new search */
  }
}
export function readLastSearch() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    return value && typeof value === "object" && typeof value.location === "string" ? value : null;
  } catch {
    return null;
  }
}
