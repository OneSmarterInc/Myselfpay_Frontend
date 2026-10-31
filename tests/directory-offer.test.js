import { it, expect } from "vitest";
import { directoryOffer } from "../src/directory-offer.js";
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
  expect(html).toContain('href="tel:+15135550123"');
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
