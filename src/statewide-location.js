import { locationCells, sortNearby } from "./spatial.js";

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
  if (
    !data ||
    !data.resolved_location ||
    !/^[A-Z]{2}$/.test(data.resolved_location.state || "") ||
    data.location_suggestions?.length
  )
    throw new Error(
      "Choose a US state, qualified city or ZIP first. Your current location can be anywhere in the world.",
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
  const state = data.resolved_location.state;
  for (const [key, value] of entries) {
    const locations =
      value.entry.location_type === "program"
        ? []
        : (value.entry.locations || []).filter(
            (location) => validLocation(location) && location.state === state,
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
    scope: "state",
    records,
    count: entries.size,
    truncated: false,
    offers_truncated: false,
  };
}

export class StatewideLocationManager {
  constructor(
    request,
    { now = () => Date.now(), ttl = 300000, maxStates = 8 } = {},
  ) {
    this.request = request;
    this.now = now;
    this.ttl = ttl;
    this.maxStates = maxStates;
    this.cache = new Map();
    this.pending = new Map();
    this.location = "";
    this.generation = 0;
    this.updateId = 0;
  }

  setLocation(value) {
    const location = String(value || "")
      .trim()
      .replace(/^([0-9]{5})-[0-9]{4}$/, "$1");
    if (!location || /^(?:national|near my location)$/i.test(location))
      throw new Error(
        "Select a US state, city or ZIP before using your location. Distances can be calculated from anywhere.",
      );
    if (location !== this.location) {
      this.generation++;
      this.active = null;
      this.location = location;
    }
  }

  clear() {
    this.generation++;
    this.updateId++;
    this.active = null;
    this.location = "";
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
    if (!this.location)
      throw new Error("Select a US state, city or ZIP first.");
    const generation = this.generation,
      update = ++this.updateId;
    const initial = !this.active;
    const data = this.active || (await this.load(this.location));
    if (generation !== this.generation || update !== this.updateId) return null;
    this.active = data;
    return {
      ...data,
      initial,
      records: sortNearby(data.records, latitude, longitude, cells.micro),
    };
  }
}
