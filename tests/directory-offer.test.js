import { it, expect } from "vitest";
import {
  directoryOffer,
  storedPrices,
  cardPriceSummary,
} from "../src/directory-offer.js";
import { originalUI } from "../src/original-ui.js";

it("renders directory centers with the standard card, comparison and real booking identity", () => {
  const entry = {
    name: "Synthetic Center",
    booking_id: "real-center-id",
    area: "Ohio",
    source: "https://example.com",
    checked: "2026-10-30",
    phone_number: "5135550123",
  };
  const offer = directoryOffer(entry);
  expect(offer.amount).toBeNull();
  expect(directoryOffer({ ...entry, distance_miles: 12 }).id).toBe(offer.id);
  const state = {
    selected: [offer.id],
    location: "National",
    mod: "",
    messages: [],
    searched: true,
    nearbyUnpriced: [entry],
  };
  const ui = originalUI({
    state,
    offers: [offer],
    DIRECTORY: [entry],
    results: [],
  });
  const html = ui.search();
  expect(html).toContain('type="checkbox"');
  expect(html).toContain("Price on request");
  expect(html).toContain("Price includes");
  expect(html).toContain("Order requirements");
  expect(html).toContain('data-appointment="real-center-id"');
  expect(html).not.toContain('href="tel:');
  expect(html).not.toContain("Facilities to contact for a quote");
  expect(html).toContain('data-booking-offer=""');
  expect(html).toContain("View details");
  expect(ui.compare()).toContain("Synthetic Center");
  expect(ui.detail(offer.id)).not.toContain("Listing unavailable");
  const directory = ui.directoryRows([entry]);
  expect(directory).toContain('<details class="lead">');
  expect(directory).toContain("<summary>Synthetic Center");
  expect(directory).toContain("Other imaging:");
  expect(directory).toContain("Location / coverage:");
  expect(directory).toContain("Provider source");
});

it("shows stored service prices with protocol and screening restrictions intact", () => {
  const entry = {
    name: "Stored price center",
    booking_id: "priced",
    checked: "2026-10-01",
    mri: "$399 per noncontrast scan/body region",
    ct: "RESTRICTED: coronary calcium-scoring screening CT $79",
    other: "Ultrasound from $115; X-ray from $33",
  };
  const offer = directoryOffer(entry);
  const state = {
    selected: [offer.id],
    location: "National",
    mod: "",
    messages: [],
    searched: true,
    nearbyUnpriced: [entry],
  };
  const ui = originalUI({
    state,
    offers: [offer],
    DIRECTORY: [entry],
    results: [],
  });
  expect(ui.price(offer)).toBe(
    "MRI: $399 per noncontrast scan/body region\nCT: RESTRICTED: coronary calcium-scoring screening CT $79\nOther imaging: Ultrasound from $115; X-ray from $33",
  );
  expect(ui.search()).not.toContain("Ask for a price");
  expect(ui.search()).toContain("Published prices · confirm scope");
  expect(ui.detail(offer.id)).toContain("screening CT $79");
  expect(cardPriceSummary(offer)).toBe("MRI: $399\nCT: $79 (screening only)");
  expect(ui.search()).not.toContain("Ultrasound from $115");
  expect(ui.detail(offer.id)).toContain("Ultrasound from $115");
  expect(ui.compare()).toContain("noncontrast scan/body region");
  expect(storedPrices(entry, "MRI")).toEqual([
    { service: "MRI", text: entry.mri },
  ]);
  expect(
    directoryOffer({ ...entry, mri: "Quote required" }, { mod: "MRI" })
      .published_prices,
  ).toEqual([]);
  expect(offer.amount).toBeNull();
});

it("keeps starting prices and explicit ranges concise without turning fees into exam prices", () => {
  expect(
    cardPriceSummary(
      directoryOffer({
        name: "Starting",
        mri: "From $265 without contrast",
        ct: "From $130 without contrast",
      }),
    ),
  ).toBe("MRI: $265 onwards\nCT: $130 onwards");
  expect(
    cardPriceSummary(
      directoryOffer({ name: "Range", mri: "$400–$600 depending on exam" }),
    ),
  ).toBe("MRI: $400 onwards");
  expect(
    cardPriceSummary(
      directoryOffer({
        name: "Fees",
        mri: "Scan $500 plus a $100 reading fee",
      }),
    ),
  ).toBe("MRI: $500");
});

it("escapes stored price descriptions before rendering them", () => {
  const entry = {
    name: "Synthetic",
    booking_id: "escape",
    mri: "$500 <img src=x onerror=alert(1)>",
    checked: "",
  };
  const offer = directoryOffer(entry);
  const ui = originalUI({
    state: { selected: [], location: "National" },
    offers: [offer],
    DIRECTORY: [],
    results: [],
  });
  expect(ui.detail(offer.id)).toContain("&lt;img");
  expect(ui.detail(offer.id)).not.toContain("<img src=x");
});

it("shows the stored MRI price and contrast supplement on the search card", () => {
  const entry = {
    name: "Advantage Diagnostics � Columbus South",
    booking_id: "columbus-south",
    mri: "MRI $400; studies ordered with contrast +$100. Specialized protocols have separate prices.",
    ct: "Not listed at this branch",
    other: "Routine X-ray $100",
  };
  const offer = directoryOffer(entry);
  const summary = "MRI: $400";
  expect(cardPriceSummary(offer)).toBe(summary);
  const ui = originalUI({
    state: {
      selected: [],
      location: "Ohio",
      mod: "",
      searched: true,
      messages: [],
    },
    offers: [offer],
    results: [offer],
    DIRECTORY: [entry],
  });
  expect(ui.search()).toContain("$400");
  expect(ui.search()).not.toContain("+$100");
  expect(ui.detail(offer.id)).toContain("+$100");
  expect(ui.search()).not.toContain("MRI: See price details");
  expect(ui.detail(offer.id)).toContain("Routine X-ray $100");
});

it("prefers without contrast even when the with-contrast price is listed first", () => {
  const offer = directoryOffer({
    name: "Contrast choices",
    mri: "$800 with contrast; $750 without contrast; $850 with/without",
    ct: "With contrast $500; Without contrast $400; With and without $600",
  });
  expect(cardPriceSummary(offer)).toBe("MRI: $750\nCT: $400");
});
it("uses with contrast next and marks ranges onwards", () => {
  expect(
    cardPriceSummary(
      directoryOffer({
        name: "Fallback",
        mri: "With contrast $800; With and without $850",
        ct: "$500 to $700 depending on exam",
      }),
    ),
  ).toBe("MRI: $800\nCT: $500 onwards");
  expect(
    cardPriceSummary(
      directoryOffer({ name: "Range", mri: "Without contrast $500\u2013$700" }),
    ),
  ).toBe("MRI: $500 onwards");
});
it("does not present standalone supplements as exam prices", () => {
  expect(
    cardPriceSummary(
      directoryOffer({ name: "Fee", mri: "Contrast surcharge $100" }),
    ),
  ).toBe("MRI: See price details");
});

it("marks ranges with a currency symbol only on the lower endpoint", () => {
  expect(
    cardPriceSummary(
      directoryOffer({ name: "Range", mri: "$500 to 700", ct: "$300-450" }),
    ),
  ).toBe("MRI: $500 onwards\nCT: $300 onwards");
});
