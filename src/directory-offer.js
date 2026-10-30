// Presentation-only quote listing. It does not create a price or backend offer.
export function directoryOffer(entry, search = {}) {
  return {
    id: "directory-" + encodeURIComponent(entry.booking_id || entry.name),
    directory_only: true,
    entry: { ...entry, checked: String(entry.checked || "") },
    type: "quote",
    amount: null,
    region: entry.area || entry.states || "Confirm location with facility",
    mod: search.mod || "Imaging services",
    contrast: "unknown",
    scope: "Confirm the exact exam and contrast with the facility",
    included:
      "Confirm the all-in self-pay price and included fees with the facility",
    order: "Confirm order and referral requirements with the facility",
    distance_miles: entry.distance_miles,
    distance_precision: entry.distance_precision,
  };
}
