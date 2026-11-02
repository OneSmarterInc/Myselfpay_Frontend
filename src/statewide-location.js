import { locationCells, sortNearby } from "./spatial.js";
import { stateForCoordinates, searchLocationHint } from "./auto-location.js";

const validLocation = (location) =>
  location &&
  ["address", "city", "zip"].includes(location.precision) &&
  Number.isFinite(location.latitude) &&
  Number.isFinite(location.longitude) &&
  Math.abs(location.latitude) <= 90 &&
  Math.abs(location.longitude) <= 180;
const samePoint = (a, b) =>
  a.latitude === b.latitude && a.longitude === b.longitude;

function offerLocations(offer) {
  if (Array.isArray(offer.locations)) return offer.locations;
  const locations = offer.entry?.locations || [];
  if (locations.length <= 1) return locations;
  const region = String(offer.region || "").toLowerCase();
  return locations.filter(
    (location) =>
      location.city &&
      new RegExp(
        "(^|[^a-z])" +
          location.city.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          "([^a-z]|$)",
      ).test(region),
  );
}

export function statewideRecords(data) {
  const national =
    String(data?.search?.location || "")
      .trim()
      .toLowerCase() === "national";
  if (
    !data ||
    (!national &&
      (!data.resolved_location ||
        !/^[A-Z]{2}$/.test(data.resolved_location.state || ""))) ||
    data.location_suggestions?.length
  )
    throw Object.assign(
      new Error(
        "Choose a US state, qualified city or ZIP first. Your current location can be anywhere in the world.",
      ),
      { code: "directory_location_required" },
    );
  const groups = ["offers", "programs", "program_entries", "nearby_unpriced"];
  if (groups.some((key) => !Array.isArray(data[key])))
    throw new Error("The server returned an invalid statewide search.");
  const entries = new Map();
  function add(entry, offer) {
    if (
      !entry ||
      typeof entry.name !== "string" ||
      typeof entry.booking_id !== "string"
    )
      throw new Error("The server returned an invalid center.");
    const key = entry.booking_id;
    if (!entries.has(key)) entries.set(key, { entry, offers: [] });
    if (offer) entries.get(key).offers.push(offer);
  }
  for (const offer of [...data.offers, ...data.programs])
    add(offer.entry, offer);
  for (const entry of [...data.program_entries, ...data.nearby_unpriced])
    add(entry);
  const records = [];
  const state = national ? "National" : data.resolved_location.state;
  for (const [key, value] of entries) {
    const locations =
      value.entry.location_type === "program"
        ? []
        : (value.entry.locations || []).filter(
            (location) =>
              validLocation(location) && (national || location.state === state),
          );
    const unique = locations.filter(
      (location, index) =>
        locations.findIndex((other) => samePoint(location, other)) === index,
    );
    for (const [index, location] of (unique.length
      ? unique
      : [null]
    ).entries()) {
      const cells = location
        ? locationCells(location.latitude, location.longitude)
        : null;
      records.push({
        id: `${key}:${index}`,
        entry_key: key,
        entry: value.entry,
        location,
        h3_res7: cells?.macro || null,
        h3_res11: cells?.micro || null,
        offers: value.offers.filter(
          (offer) =>
            !location ||
            offerLocations(offer).some((site) => samePoint(site, location)),
        ),
      });
    }
  }
  return {
    state,
    version: data.version,
    scope: national ? "national" : "state",
    records,
    count: entries.size,
    truncated: false,
    offers_truncated: false,
  };
}

export class StatewideLocationManager {
  constructor(
    request,
    {
      now = () => Date.now(),
      ttl = 300000,
      maxStates = 8,
      resolveState = stateForCoordinates,
      normalizeHint = searchLocationHint,
    } = {},
  ) {
    this.request = request;
    this.now = now;
    this.ttl = ttl;
    this.maxStates = maxStates;
    this.resolveState = resolveState;
    this.normalizeHint = normalizeHint;
    this.cache = new Map();
    this.pending = new Map();
    this.location = "";
    this.activeLocation = "";
    this.generation = 0;
    this.updateId = 0;
    this.unavailableLocations = new Set();
  }

  setLocation(value) {
    const location = String(value || "")
      .trim()
      .replace(/^([0-9]{5})-[0-9]{4}$/, "$1");
    if (!location || /^near my location$/i.test(location))
      throw new Error(
        "Select a US state, city or ZIP before using your location. Distances can be calculated from anywhere.",
      );
    if (location !== this.location || this.automatic) {
      this.generation++;
      this.active = null;
      this.activeLocation = "";
      this.location = location;
    }
    this.automatic = false;
  }

  setAutomaticLocation(value = "") {
    this.generation++;
    this.updateId++;
    this.automatic = true;
    this.unavailableLocations.clear();
    this.fallbackLocation = String(value || "").trim();
    this.active = null;
    this.activeLocation = "";
    this.location = "";
  }

  clear() {
    this.generation++;
    this.updateId++;
    this.active = null;
    this.activeLocation = "";
    this.automatic = false;
    this.location = "";
    this.fallbackLocation = "";
    this.unavailableLocations.clear();
    this.cache.clear();
    this.pending.clear();
  }

  async load(location) {
    const key = location.toLowerCase();
    const cached = this.cache.get(key);
    if (cached && this.now() - cached.time < this.ttl) return cached.data;
    if (this.pending.has(key)) return this.pending.get(key);
    const generation = this.generation;
    const promise = this.request("/search", {
      location,
      scope: "state",
      radius: 50,
      mod: "",
      body: "",
      contrast: "unknown",
      budget: 0,
      type: "all",
      sort: "distance",
      selected: [],
    })
      .then((value) => {
        const data = statewideRecords(value);
        if (generation === this.generation) {
          this.cache.delete(key);
          this.cache.set(key, { data, time: this.now() });
          while (this.cache.size > this.maxStates)
            this.cache.delete(this.cache.keys().next().value);
        }
        return data;
      })
      .finally(() => {
        if (this.pending.get(key) === promise) this.pending.delete(key);
      });
    this.pending.set(key, promise);
    return promise;
  }

  async update(latitude, longitude) {
    const cells = locationCells(latitude, longitude);
    const generation = this.generation,
      update = ++this.updateId;
    let location = this.location;
    let detected = null;
    if (this.automatic) {
      try {
        detected = await this.resolveState(latitude, longitude);
        location =
          detected || (await this.normalizeHint(this.fallbackLocation));
      } catch {
        location = "National";
      }
    }
    if (this.automatic && this.unavailableLocations.has(location))
      location = "National";
    if (!location) throw new Error("Select a US state, city or ZIP first.");
    if (generation !== this.generation || update !== this.updateId) return null;
    const initial = !this.active || this.activeLocation !== location;
    let data;
    try {
      data = !initial ? this.active : await this.load(location);
    } catch (error) {
      if (
        !this.automatic ||
        error.code !== "directory_location_required" ||
        location === "National"
      )
        throw error;
      if (generation !== this.generation || update !== this.updateId)
        return null;
      this.unavailableLocations.add(location);
      location = "National";
      data = await this.load(location);
    }
    if (this.automatic && !data.count && location !== "National") {
      if (generation !== this.generation || update !== this.updateId)
        return null;
      this.unavailableLocations.add(location);
      location = "National";
      data = await this.load(location);
    }
    if (generation !== this.generation || update !== this.updateId) return null;
    this.active = data;
    this.activeLocation = location;
    this.location = location;
    return {
      ...data,
      initial,
      queryLocation: location,
      records: sortNearby(data.records, latitude, longitude, cells.micro),
    };
  }
}
