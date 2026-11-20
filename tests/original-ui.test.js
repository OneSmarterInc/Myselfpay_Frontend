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
    expect(originalUI(context).search()).toContain("4 facilities");
    context.state.resultsPage = 1;
    expect(originalUI(context).search()).toContain("4 facilities");
    context.results = [];
    context.state.nearbyUnpriced = [];
    context.state.programEntries = [];
    expect(originalUI(context).search()).toContain("0 facilities");
    context.results = [offer];
    expect(originalUI(context).search()).toContain("1 facility</h2>");
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

it("lists priced cards nearest first, then unpriced cards nearest first, across categories", () => {
  const completeEntry = {
    ...entry,
    name: "Complete",
    coverage: "123 Main Street",
    booking_id: "clinic",
    email: "center@example.com",
  };
  const nearby = {
    ...offer,
    id: "near",
    entry: { ...entry, name: "Nearby" },
    distance_miles: 1,
  };
  const complete = {
    ...offer,
    id: "complete",
    entry: completeEntry,
    distance_miles: 80,
  };
  const farther = {
    ...offer,
    id: "far",
    entry: { ...entry, name: "Farther" },
    distance_miles: 20,
  };
  const unknown = { ...entry, name: "Unknown distance" };
  const context = {
    state: {
      ...state,
      searched: true,
      programs: [complete],
      nearbyUnpriced: [unknown],
    },
    results: [farther, nearby],
    DIRECTORY: [],
    offers: [],
    catalogReady: true,
  };
  const html = originalUI(context).search();
  const names = [...html.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]);
  expect(names).toEqual(["Nearby", "Farther", "Complete", "Unknown distance"]);
  context.state.nearToMe = true;
  const nearHtml = originalUI(context).search();
  expect([...nearHtml.matchAll(/<h3>([^<]+)<\/h3>/g)].map(m=>m[1])).toEqual(["Nearby", "Farther", "Complete", "Unknown distance"]);
  expect(nearHtml).toContain('role="switch" aria-checked="true"');
  context.state.nearToMe = false;
  context.results = Array.from({ length: 11 }, (_, i) => ({
    ...nearby,
    id: "near" + i,
  }));
  const page = originalUI(context).search();
  expect(page).toContain("of 13 listings");
  expect(page).toContain("<h3>Nearby</h3>");
  expect(page).not.toContain("<h3>Complete</h3>");
});

it("sorts GPS cards by actual miles, displays decimals and keeps missing distances last", () => {
  const named = (name, miles) => ({
    ...offer,
    id: name,
    distance_miles: miles,
    entry: {
      ...entry,
      name,
      booking_id: name,
      coverage: name === "Far complete" ? "123 Main Street" : "",
    },
  });
  const context = {
    state: {
      ...state,
      searched: true,
      location: "Ohio",
      spatialActive: true,
      nearToMe: true,
      sort: "distance",
    },
    account: { tenant: "guest" },
    DIRECTORY: [],
    offers: [],
    results: [
      named("Far complete", 9200.123),
      named("Near", 9.44),
      named("Unknown", null),
    ],
    catalogReady: true,
  };
  const html = originalUI(context).search();
  expect(
    [...html.matchAll(/<h3>([^<]+)<\/h3>/g)].map((match) => match[1]),
  ).toEqual(["Near", "Far complete", "Unknown"]);
  expect(html).toContain("9.4 miles away");
  expect(html).toContain("9,200.1 miles away");
  expect(html).toContain("Distance unavailable");
});

it("puts priced cards first by distance, then unpriced cards by distance", () => {
 const make=(name,amount,distance)=>({...offer,id:name,type:amount==null?"quote":"fixed",amount,distance_miles:distance,entry:{...entry,name,booking_id:name}});
 const context={state:{...state,searched:true,nearToMe:false},DIRECTORY:[],offers:[],catalogReady:true,
 results:[make("Nearby quote",null,0),make("Far priced",350,80),make("Near priced",250,3),make("Far quote",null,50)]};
 const names=()=>[...originalUI(context).search().matchAll(/<h3>([^<]+)<\/h3>/g)].map(m=>m[1]);
 expect(names()).toEqual(["Near priced","Far priced","Nearby quote","Far quote"]);
 context.state.nearToMe=true;
 expect(names()).toEqual(["Near priced","Far priced","Nearby quote","Far quote"]);
});

it("does not rank test centers or complete listings above others", () => {
 const testCenter={...entry,name:"Gitesh Imaging Center",booking_id:"portal-gitesh-email-test-center",is_test_center:true,source:"",distance_miles:80};
 const demo={...offer,id:"demo",entry:{...entry,name:"ammar test",is_test_center:true,booking_id:"portal-ammar-test-center"},distance_miles:20};
 const nearby={...offer,id:"nearby",type:"fixed",amount:250,distance_miles:1,entry:{...entry,name:"Real center",coverage:"123 Main Street",booking_id:"real"}};
 const context={state:{...state,searched:true,nearToMe:false,nearbyUnpriced:[testCenter]},results:[nearby,demo],DIRECTORY:[],offers:[],catalogReady:true};
 const names=[...originalUI(context).search().matchAll(/<h3>([^<]+)<\/h3>/g)].map(m=>m[1]);
 expect(names[0]).toBe("Real center");
 expect(names.indexOf("ammar test")).toBeLessThan(names.indexOf("Gitesh Imaging Center"));
});

