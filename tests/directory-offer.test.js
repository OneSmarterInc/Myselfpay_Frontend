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
  ).toBe("MRI: From $265\nCT: From $130");
  expect(
    cardPriceSummary(
      directoryOffer({ name: "Range", mri: "$400–$600 depending on exam" }),
    ),
  ).toBe("MRI: $400–$600");
  expect(
    cardPriceSummary(
      directoryOffer({
        name: "Fees",
        mri: "Scan $500 plus a $100 reading fee",
      }),
    ),
  ).toBe("MRI: See price details");
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
