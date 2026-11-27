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

function primaryPrice(text) {
  const money =
    /(?:\$\s*|\bUSD\s*)(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*USD\b/gi;
  const candidates = [];
  for (const clause of text.split(/;|\n|\.(?=\s+[A-Za-z])/)) {
    const prices = [...clause.matchAll(money)];
    prices.forEach((match, index) => {
      const before = clause.slice(
        index ? prices[index - 1].index + prices[index - 1][0].length : 0,
        match.index,
      );
      const after = clause.slice(
        match.index + match[0].length,
        prices[index + 1]?.index ?? clause.length,
      );
      // Never use supplements, ancillary fees, or the upper end of a range as exam prices.
      if (
        /[+]\s*$/.test(before) ||
        /\b(?:plus|additional|extra|add[- ]?on|supplement|surcharge)\s*(?:a\s*)?$/i.test(
          before,
        ) ||
        /^\s*(?:reading|interpretation|contrast|facility)\s*(?:charge|fee|supplement|surcharge)\b/i.test(
          after,
        ) ||
        /\b(?:reading|interpretation|contrast|facility)\s*(?:charge|fee|supplement|surcharge)\s*(?:of|is|:)?\s*$/i.test(
          before,
        )
      )
        return;
      const range =
        /^\s*(?:[-\u2013\u2014]|to)\s*(?:\$\s*)?\d/.test(after) ||
        (prices[index + 1] && /^\s*(?:[-\u2013\u2014]|to)\s*$/.test(after));
      if (index && /^\s*(?:[-\u2013\u2014]|to)\s*$/.test(before)) return;
      const protocol =
        /\b(?:without\s+(?:and\s+)?with(?:\s+contrast)?|with\s*(?:\/|and)\s*without(?:\s+contrast)?|without\s+contrast|non[- ]?contrast|with(?:\s+contrast)?)\b/gi;
      const nearby = [...before.matchAll(protocol)].map((m) => ({
        label: m[0],
        distance: before.length - m.index - m[0].length,
      }));
      nearby.push(
        ...[...after.matchAll(protocol)].map((m) => ({
          label: m[0],
          distance: m.index,
        })),
      );
      nearby.sort((a, b) => a.distance - b.distance);
      const label = nearby[0]?.label || "";
      const both =
        /without\s+(?:and\s+)?with|with\s*(?:\/|and)\s*without/i.test(label);
      const rank = both
        ? 2
        : /without|non[- ]?contrast/i.test(label)
          ? 0
          : /with/i.test(label)
            ? 1
            : 3;
      const qualifier =
        /\b(?:from|starting(?:\s+(?:at|from))?|as low as)\s*$/i.test(before) ||
        range
          ? " onwards"
          : /\b(?:up to|maximum)\s*$/i.test(before)
            ? " maximum"
            : /\baverage\s*$/i.test(before)
              ? " average"
              : "";
      candidates.push({
        rank,
        amount: Number((match[1] || match[2]).replaceAll(",", "")),
        text: "$" + (match[1] || match[2]) + qualifier,
        screening: /\b(?:screening|calcium)\b/i.test(clause),
      });
    });
  }
  candidates.sort((a, b) => a.rank - b.rank || a.amount - b.amount);
  const chosen = candidates[0];
  return chosen
    ? chosen.text + (chosen.screening ? " (screening only)" : "")
    : "See price details";
}

function workbookPriceLines({ service, text }) {
  const lines = text.split(/\n/).filter(line => !/UNVERIFIED source price|SUPPLIED FINDINGS/i.test(line));
  const wording = lines.join("\n").trim() || text.split(/[—–]/)[0];
  const output = [];
  for (const clause of wording.split(/[;\n]/)) {
    const prices = [...clause.matchAll(/(?:\$\s*|\bUSD\s*)(\d[\d,]*(?:\.\d{1,2})?)(?:\s*(?:to|[-–])\s*\$?\s*(\d[\d,]*(?:\.\d{1,2})?))?/gi)];
    for (const [index, price] of prices.entries()) {
      const before = clause.slice(index ? prices[index - 1].index + prices[index - 1][0].length : 0, price.index);
      const after = clause.slice(price.index + price[0].length, prices[index + 1]?.index ?? clause.length);
      if (/(?:surcharge|supplement|fee|add[- ]?on|additional|extra|plus)\s*(?:of|is|:)?\s*$/i.test(before) || /\+\s*$/.test(before)) continue;
      const protocols = /\b(?:with\s*(?:and|\/)\s*without\s+contrast|without\s+and\s+with\s+contrast|without\s+contrast|non[- ]?contrast|with\s+contrast)\b/gi;
      const preceding = [...before.matchAll(protocols)].at(-1)?.[0];
      const following = after.match(/^\s*(with\s*(?:and|\/)\s*without\s+contrast|without\s+and\s+with\s+contrast|without\s+contrast|non[- ]?contrast|with\s+contrast)\b/i)?.[1];
      let contrast = preceding || following || "";
      contrast = /with\s*(?:and|\/)\s*without|without\s+and\s+with/i.test(contrast) ? "with and without contrast" : /without|non/i.test(contrast) ? "without contrast" : contrast ? "with contrast" : "";
      let scan = service;
      if (service === "Other imaging") {
        const scanPattern = /PET\s*\/\s*CT|X[- ]?ray|ultrasound|mammogram|mammography|DEXA|bone density/gi;
        scan = [...before.matchAll(scanPattern)].at(-1)?.[0] || clause.match(scanPattern)?.[0] || "Imaging";
        scan = /x[- ]?ray/i.test(scan) ? "X-ray" : /mamm/i.test(scan) ? "Mammogram" : /ultrasound/i.test(scan) ? "Ultrasound" : /bone|dexa/i.test(scan) ? "DEXA" : scan;
      }
      const qualifier = /\b(?:from|starting(?:\s+at)?|as low as)\s*$/i.test(before) ? "from " : /\b(?:up to|maximum)\s*$/i.test(before) ? "up to " : /\baverage\s*$/i.test(before) ? "average " : "";
      const amount = "$" + price[1] + (price[2] ? "–$" + price[2] : "");
      const scope = /\b(?:screening|calcium)\b/i.test(clause) ? " (screening)" : "";
      output.push(`${scan} ${qualifier}${amount}${contrast ? " " + contrast : ""}${scope}`);
    }
  }
  return [...new Set(output)];
}

function lowestScanPrices(prices) {
  const lowest = new Map();
  for (const line of prices.flatMap(workbookPriceLines)) {
    const match = line.match(/^(.*?)\s+(?:(?:from|up to|average)\s+)?\$(\d[\d,]*(?:\.\d{1,2})?)/i);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    const amount = Number(match[2].replaceAll(",", ""));
    if (!lowest.has(key) || amount < lowest.get(key).amount) {
      const text = line.replace(/(?:from\s+)?(\$\d[\d,]*(?:\.\d{1,2})?)\s*[–-]\s*\$\d[\d,]*(?:\.\d{1,2})?/i, "from $1");
      lowest.set(key, {amount, text});
    }
  }
  return [...lowest.values()].map(price => price.text);
}

export function cardPriceSummary(offer) {
  if (!offer.directory_only || !offer.published_prices?.length) return null;


  if (offer.entry?.workbook_prices) return lowestScanPrices(offer.published_prices).join("\n") || "Ask for a price";
  const services = offer.published_prices.filter((price) =>
    ["MRI", "CT"].includes(price.service),
  );
  if (!services.length) return "Ask for a price";
  return services
    .map(({ service, text }) => service + ": " + primaryPrice(text))
    .join("\n");
}


export function availablePriceCount(offer) {
  if (offer.directory_only) {
    return lowestScanPrices(offer.published_prices || []).length;
  }
  if (offer.card_prices?.length) return new Set(offer.card_prices.filter(line => /\$\s*\d/.test(line))).size;
  return Number.isFinite(offer.amount) && offer.amount > 0 && !["quote", "conflict"].includes(offer.type) ? 1 : 0;
}
export function mostPricesFirst(offers) {
  const scored = offers.map((offer, index) => ({offer, index, count: availablePriceCount(offer)}));
  return scored.sort((a, b) => b.count - a.count || a.index - b.index).map(item => item.offer);
}
