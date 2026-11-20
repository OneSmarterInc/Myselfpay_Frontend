// Filtering, ordering and paging for the All imaging facilities list.
import { storedPrices } from "./directory-offer.js";

export const DIRECTORY_PAGE_SIZE = 10;

export function formatCount(n) {
  return Number(n || 0).toLocaleString("en-US");
}

export function cityState(entry) {
  const area = String(entry.area || "").trim();
  const st = String(entry.states || "").trim();
  if (area && st && area.toLowerCase() !== st.toLowerCase()) {
    return area + ", " + st;
  }
  return area || st;
}

export function hasPublishedPrice(entry, exam = "") {
  return storedPrices(entry, exam).length > 0;
}

export function filterDirectory(entries, { query = "", priced = false, exam = "" } = {}) {
  const flat = (v) => String(v).toLowerCase().replace(/[,.]/g, " ").replace(/\s+/g, " ").trim();
  const q = flat(query);
  return entries.filter((entry) => {
    if (priced || exam) {
      if (!hasPublishedPrice(entry, exam)) return false;
    }
    if (!q) return true;
    return flat([entry.name, entry.area, entry.states, entry.coverage].join(" ")).includes(q);
  });
}

// Nearest first when distances are known; otherwise state, then city, then name.
export function sortDirectory(entries) {
  const dist = (e) => (Number.isFinite(Number(e.distance_miles)) && e.distance_miles !== null && e.distance_miles !== "" ? Number(e.distance_miles) : null);
  const text = (a, b) => String(a || "").localeCompare(String(b || ""), "en", { sensitivity: "base" });
  const useDistance = entries.some((e) => dist(e) !== null);
  return [...entries].sort((a, b) => {
    if (useDistance) {
      const da = dist(a), db = dist(b);
      if (da !== db) return da === null ? 1 : db === null ? -1 : da - db;
    }
    return text(a.states, b.states) || text(a.area, b.area) || text(a.name, b.name);
  });
}

export function directoryCountLine(total, page, size = DIRECTORY_PAGE_SIZE) {
  if (!total) return "No facilities match. Try a different name, city, state or ZIP.";
  const start = page * size + 1;
  const end = Math.min(start + size - 1, total);
  return `Showing ${formatCount(start)} to ${formatCount(end)} of ${formatCount(total)}`;
}
