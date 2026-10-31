import { describe, it, expect } from "vitest";
import { originalUI } from "../src/original-ui.js";

const state = {
  location: "",
  mod: "",
  body: "",
  contrast: "unknown",
  scope: "state",
  radius: 50,
  budget: 0,
  type: "all",
  selected: [],
  messages: [],
  usage: {},
  mode: "classic",
};
const entry = {
  name: "<script>alert(1)</script>",
  area: "Ohio",
  coverage: "",
  notes: "",
  additional: "",
  source: "https://example.com",
  checked: "2026-10-30",
  locations: [],
};
const offer = {
  id: "one",
  entry,
  type: "starting",
  amount: 200,
  mod: "MRI",
  contrast: "unknown",
  scope: "Knee",
  included: "Confirm with facility",
};
const ui = originalUI({
  state,
  account: null,
  DIRECTORY: [],
  offers: [offer],
  results: [],
  catalogReady: true,
  catalogError: "",
  summary: null,
});
describe("original SelfPay presentation contracts", () => {
  it("counts every matching offer, program and directory listing across pages", () => {
    const context = {
      state: {
        ...state,
        searched: true,
        nearbyUnpriced: [entry, entry],
        programs: [],
        programEntries: [entry],
      },
      account: { tenant: "guest" },
      DIRECTORY: [],
      offers: [offer],
      results: [offer],
      catalogReady: true,
    };
    expect(originalUI(context).search()).toContain("4 matching listings");
    context.state.resultsPage = 1;
    expect(originalUI(context).search()).toContain("4 matching listings");
    context.results = [];
    context.state.nearbyUnpriced = [];
    context.state.programEntries = [];
    expect(originalUI(context).search()).toContain("0 matching listings");
    context.results = [offer];
    expect(originalUI(context).search()).toContain("1 matching listing</h2>");
  });
  it("retains the original homepage sections and search controls", () => {
    expect(ui.home()).toContain("Find self-pay MRI and CT near you.");
    expect(ui.home()).toContain("welcome-choices");
    expect(ui.search()).toContain("Find and compare imaging options");
    expect(ui.search()).toContain('id="locationToggle"');
  });
  it("preserves qualified prices and escapes provider text", () => {
    expect(ui.price(offer)).toBe("From $200");
    expect(ui.price({ ...offer, type: "quote" })).toBe("Ask for a price");
    expect(ui.detail("one")).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(ui.detail("one")).toContain("Starting price · quote needed");
  });
});
