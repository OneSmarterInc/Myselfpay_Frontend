// Presentation-only directory listing. Keep stored price wording and scope intact.
export function storedPrices(entry, service = "") {
  const fields = service
    ? [[service, service.toLowerCase()]]
    : [
        ["MRI", "mri"],
        ["CT", "ct"],
        ["Other imaging", "other"],
      ];
  return fields.flatMap(([label, key]) => {
    const text = String(entry[key] || "").trim();
    return /(?:\$\s*\d|\bUSD\s*\d|\b\d[\d,.]*\s*USD\b)/i.test(text)
      ? [{ service: label, text }]
      : [];
  });
}

export function directoryOffer(entry, search = {}) {
  const publishedPrices = storedPrices(entry, search.mod);
  return {
    id: "directory-" + encodeURIComponent(entry.booking_id || entry.name),
    directory_only: true,
    entry: { ...entry, checked: String(entry.checked || "") },
    type: publishedPrices.length ? "published" : "quote",
    published_prices: publishedPrices,
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
