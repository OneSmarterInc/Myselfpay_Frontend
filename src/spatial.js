import {
  latLngToCell,
  cellToLatLng,
  gridDistance,
  gridDisk,
  isValidCell,
  getResolution,
} from "h3-js";
import { directoryOffer } from "./directory-offer.js";

export function locationCells(latitude, longitude) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    throw new Error("Your device returned an invalid location.");
  return {
    macro: latLngToCell(latitude, longitude, 7),
    micro: latLngToCell(latitude, longitude, 11),
  };
}

export function haversineMiles(a, b) {
  const radians = (value) => (value * Math.PI) / 180;
  const dlat = radians(b[0] - a[0]),
    dlng = radians(b[1] - a[1]);
  const value =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(radians(a[0])) * Math.cos(radians(b[0])) * Math.sin(dlng / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, value))));
}

export function sortNearby(
  records,
  latitude,
  longitude,
  micro,
  distance = gridDistance,
) {
  return records
    .map((record) => {
      let gridSteps = null;
      try {
        gridSteps = distance(micro, record.h3_res11);
      } catch {}
      const location = record.location;
      const miles = haversineMiles(
        [latitude, longitude],
        [location.latitude, location.longitude],
      );
      return {
        ...record,
        grid_steps: gridSteps,
        distance_miles: miles,
        distance_method:
          gridSteps === null ? "haversine-fallback" : "haversine",
        distance_precision: location.precision,
      };
    })
    .sort(
      (a, b) =>
        a.distance_miles - b.distance_miles ||
        (a.grid_steps ?? Infinity) - (b.grid_steps ?? Infinity) ||
        a.id.localeCompare(b.id),
    );
}

function validCell(cell, resolution) {
  return (
    typeof cell === "string" &&
    /^[0-9a-f]{15}$/.test(cell) &&
    isValidCell(cell) &&
    getResolution(cell) === resolution
  );
}

export function validateBundle(bundle, center) {
  const disk = new Set(gridDisk(center, 1));
  if (
    !bundle ||
    bundle.center_cell !== center ||
    !Array.isArray(bundle.queried_cells) ||
    bundle.queried_cells.length !== disk.size ||
    new Set(bundle.queried_cells).size !== disk.size ||
    bundle.queried_cells.some((cell) => !disk.has(cell)) ||
    !Array.isArray(bundle.records) ||
    bundle.records.length > 500 ||
    !Number.isInteger(bundle.count) ||
    bundle.count < bundle.records.length ||
    typeof bundle.truncated !== "boolean" ||
    bundle.truncated !== bundle.count > bundle.records.length
  )
    throw new Error("The server returned an invalid location bundle.");
  const ids = new Set();
  for (const record of bundle.records) {
    const location = record?.location;
    if (
      !record ||
      typeof record.id !== "string" ||
      ids.has(record.id) ||
      !validCell(record.h3_res7, 7) ||
      !disk.has(record.h3_res7) ||
      !validCell(record.h3_res11, 11) ||
      !location ||
      !["address", "zip", "city"].includes(location.precision) ||
      typeof record.entry?.name !== "string" ||
      typeof record.entry_key !== "string"
    )
      throw new Error("The server returned an invalid location record.");
    const cells = locationCells(location.latitude, location.longitude);
    if (cells.macro !== record.h3_res7 || cells.micro !== record.h3_res11)
      throw new Error("The server returned inconsistent location cells.");
    ids.add(record.id);
  }
  return bundle;
}

export class SpatialDataManager {
  constructor(
    request,
    { now = () => Date.now(), ttl = 300000, maxBundles = 8 } = {},
  ) {
    this.request = request;
    this.now = now;
    this.ttl = ttl;
    this.maxBundles = maxBundles;
    this.cache = new Map();
    this.pending = new Map();
    this.active = null;
    this.generation = 0;
  }

  clear() {
    this.generation++;
    this.cache.clear();
    this.pending.clear();
    this.active = null;
  }

  async load(cell) {
    const cached = this.cache.get(cell);
    if (cached && this.now() - cached.time < this.ttl) return cached.bundle;
    if (this.pending.has(cell)) return this.pending.get(cell);
    const generation = this.generation;
    const promise = this.request(`/v1/spatial-bundle/${cell}/`)
      .then((value) => {
        const bundle = validateBundle(value, cell);
        if (generation === this.generation) {
          this.cache.delete(cell);
          this.cache.set(cell, { bundle, time: this.now() });
          while (this.cache.size > this.maxBundles)
            this.cache.delete(this.cache.keys().next().value);
        }
        return bundle;
      })
      .finally(() => {
        if (this.pending.get(cell) === promise) this.pending.delete(cell);
      });
    this.pending.set(cell, promise);
    return promise;
  }

  async update(latitude, longitude) {
    const { macro, micro } = locationCells(latitude, longitude);
    const generation = this.generation;
    const update = (this.updateId = (this.updateId || 0) + 1);
    const bundle =
      this.active?.center_cell === macro ? this.active : await this.load(macro);
    if (generation !== this.generation || update !== this.updateId) return null;
    this.active = bundle;
    return {
      ...bundle,
      records: sortNearby(bundle.records, latitude, longitude, micro),
    };
  }
}

export function locationError(error) {
  return (
    {
      1: "Location permission was denied. Allow location in your browser settings or search by ZIP or state.",
      2: "Your device could not determine your location. Search by ZIP or state instead.",
      3: "Location lookup timed out. Try again or search by ZIP or state.",
    }[error?.code] || "Location is unavailable. Search by ZIP or state instead."
  );
}

export function watchLocation(
  onPosition,
  onError,
  navigatorObject = globalThis.navigator,
  secure = globalThis.isSecureContext !== false,
) {
  if (!secure || !navigatorObject?.geolocation) {
    onError(
      new Error(
        "Browser location requires HTTPS and a supported browser. Search by ZIP or state instead.",
      ),
    );
    return () => {};
  }
  let id;
  try {
    id = navigatorObject.geolocation.watchPosition(
      (position) =>
        onPosition(position.coords.latitude, position.coords.longitude),
      (error) =>
        onError(
          Object.assign(new Error(locationError(error)), { code: error.code }),
        ),
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 15000 },
    );
  } catch {
    onError(
      new Error(
        "Browser location could not start. Search by ZIP or state instead.",
      ),
    );
    return () => {};
  }
  return () => navigatorObject.geolocation.clearWatch(id);
}

export function spatialOffers(records, search) {
  const seen = new Set();
  const ordered =
    search.sort === "scope"
      ? [...records].sort((a, b) => a.id.localeCompare(b.id))
      : records;
  const offers = ordered.flatMap((record) => {
    if (seen.has(record.entry_key)) return [];
    seen.add(record.entry_key);
    const entry = {
      ...record.entry,
      booking_id: record.entry_key,
      distance_miles: record.distance_miles,
      distance_precision: record.distance_precision,
    };
    const text = String(entry[search.mod?.toLowerCase()] || "");
    if (
      search.mod &&
      (!text ||
        /\b(?:not (?:offered|listed|available)|unavailable)\b/i.test(text))
    )
      return [];
    const mapped = (record.offers || [])
      .filter(
        (offer) =>
          (!search.mod || offer.mod === search.mod) &&
          (search.contrast === "unknown" ||
            offer.contrast === search.contrast) &&
          (search.type === "all" || offer.type === search.type) &&
          (!search.budget ||
            (typeof offer.amount === "number" &&
              offer.amount <= search.budget &&
              !["quote", "conflict"].includes(offer.type))),
      )
      .map((offer) => ({
        ...offer,
        entry,
        distance_miles: record.distance_miles,
        distance_precision: record.distance_precision,
      }));
    if (mapped.length) return mapped;
    const offer = directoryOffer(entry, search);
    if (search.budget || !["all", "quote"].includes(search.type)) return [];
    if (search.contrast !== "unknown") {
      const details = search.mod
        ? text
        : [entry.mri, entry.ct, entry.other].join(" ");
      const both = /\b(?:without and with|with and without)\s+contrast\b/i.test(
        details,
      );
      if (
        search.contrast === "both"
          ? !both
          : both ||
            !new RegExp("\\b" + search.contrast + "\\s+contrast\\b", "i").test(
              details,
            )
      )
        return [];
    }
    return [offer];
  });
  if (search.sort === "price")
    offers.sort(
      (a, b) =>
        (a.type === "fixed" ? a.amount : Infinity) -
          (b.type === "fixed" ? b.amount : Infinity) ||
        (a.distance_miles ?? Infinity) - (b.distance_miles ?? Infinity),
    );
  return offers;
}
