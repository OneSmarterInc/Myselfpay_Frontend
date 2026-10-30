export const contrastLabel = (value) =>
  ({
    unknown: "Contrast unconfirmed",
    without: "Without contrast",
    with: "With contrast",
    both: "Without and with contrast",
  })[value] || "Contrast unconfirmed";
export function price(offer) {
  if (
    offer.type === "conflict" ||
    offer.type === "quote" ||
    offer.amount == null
  )
    return "Ask for a price";
  const money = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  if (offer.type === "starting") return "From " + money(offer.amount);
  if (offer.type === "maximum") return "Up to " + money(offer.amount);
  if (offer.type === "range")
    return money(offer.amount) + "–" + money(offer.max);
  if (offer.type === "average")
    return "Published average " + money(offer.amount);
  return money(offer.amount);
}
export function safeWebsite(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function phoneOf(entry) {
  const m = String(entry.phone || entry.coverage || "").match(
    /\+?1?[ .-]?\(?(\d{3})\)?[-. ]?(\d{3})[-. ](\d{4})/,
  );
  return m ? m.slice(1).join("-") : "";
}
