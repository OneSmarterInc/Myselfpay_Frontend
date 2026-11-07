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

export function cardPriceSummary(offer) {
  if (!offer.directory_only || !offer.published_prices?.length) return null;
  const services = offer.published_prices.filter((price) =>
    ["MRI", "CT"].includes(price.service),
  );
  if (!services.length) return "Ask for a price";
  return services
    .map(({ service, text }) => {
      const prices = [
        ...text.matchAll(
          /(?:\$\s*|\bUSD\s*)(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*USD\b/gi,
        ),
      ];
      if (!prices.length) return service + ": See price details";
      const amounts = [
        ...new Set(prices.map((match) => "$" + (match[1] || match[2]))),
      ];
      const starts = text.match(
        /\b(?:from|starting(?:\s+(?:at|from))?|as low as)\s*(?:\$\s*|USD\s*)(\d[\d,]*(?:\.\d{1,2})?)/i,
      );
      let value;
      if (starts) value = "From $" + starts[1];
      else if (prices.length === 1)
        value =
          (/\b(?:up to|maximum)\b/i.test(text)
            ? "Up to "
            : /\baverage\b/i.test(text)
              ? "Average "
              : "") + amounts[0];
      else if (
        prices.length === 2 &&
        /^\s*(?:[-–—]|to)\s*$/.test(
          text.slice(prices[0].index + prices[0][0].length, prices[1].index),
        )
      )
        value = amounts.join("–");
      // Multiple amounts may describe contrast supplements, reading fees, or
      // different exams. Keep their labels instead of hiding or combining them.
      else value = text.replace(new RegExp("^" + service + "\\s*[:��-]?\\s*", "i"), "");
      if (
        /\b(?:screening|calcium)\b/i.test(text) &&
        value !== "See price details"
      )
        value += " (screening only)";
      return service + ": " + value;
    })
    .join("\n");
}
