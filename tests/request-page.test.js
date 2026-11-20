import { describe, it, expect } from "vitest";
import { originalUI } from "../src/original-ui.js";
import { calendarFile } from "../src/request-calendar.js";

const ui = originalUI({ state: { selected: [], messages: [], usage: {} }, offers: [], DIRECTORY: [], results: [] });
const base = {
  id: "REQ-123",
  status: "requested",
  delivery: "sent",
  clinic_name: "Synthetic Imaging",
  clinic_phone: "(555) 555-0100",
  location: "1 Main St, Dayton, OH 45402",
  service: "MRI",
  exam: "knee",
  contrast: "without",
  slots: [],
  timezone: "America/New_York",
  price_text: "$400",
  created: Date.UTC(2026, 10, 20, 17, 34) / 1000,
};

describe("request page", () => {
  it("names the facility, exam and phone under the code", () => {
    const html = ui.receipt(base, "t");
    expect(html).toContain('flow-facility-line">Synthetic Imaging · MRI knee without contrast · (555) 555-0100');
  });
  it("marks the current step and stamps the sent step", () => {
    const html = ui.receipt(base, "t");
    expect(html).toMatch(/Request sent \d{1,2}:\d{2}/);
    expect(html).toContain('aria-current="step"><span>2</span>');
    expect(ui.receipt({ ...base, status: "voicemail" }, "t")).toContain('aria-current="step"><span>3</span>');
  });
  it("puts Back to results at the top and offers Cancel request", () => {
    const html = ui.receipt(base, "t");
    expect(html.indexOf("Back to results")).toBeLessThan(html.indexOf("flow-status-hero"));
    expect(html.match(/Back to results/g)).toHaveLength(1);
    expect(html).toContain('id="receiptCancel"');
  });
  it("shows the confirmed time with Directions, Call, Add to calendar and the order line", () => {
    const html = ui.receipt({ ...base, status: "scheduled", approved_slot: { date: "2026-12-02", time: "09:30", timezone: "America/New_York" } }, "t");
    expect(html).toContain("<h1>Time confirmed</h1>");
    expect(html).toContain("Synthetic Imaging set your MRI knee without contrast for");
    expect(html).toContain("To change the time, call Synthetic Imaging.");
    expect(html).toContain("Bring your imaging order and your reference code. The facility tells you anything else when it calls.");
    expect(html).toContain(">Directions<");
    expect(html).toContain("Call (555) 555-0100");
    expect(html).toContain("Add to calendar");
    expect(html).toContain('data-confirmed="1"');
  });
  it("hides Cancel once the request is closed", () => {
    expect(ui.receipt({ ...base, status: "cancelled" }, "t")).not.toContain("receiptCancel");
  });
});

describe("calendar file", () => {
  const request = { ...base, approved_slot: { date: "2026-12-02", time: "09:30" } };
  it("builds a one-hour event at the confirmed time", () => {
    const file = calendarFile(request);
    const body = decodeURIComponent(file.href.split(",")[1]);
    expect(file.filename).toBe("myselfpay-REQ-123.ics");
    expect(body).toContain("DTSTART:20261202T093000");
    expect(body).toContain("DTEND:20261202T103000");
    expect(body).toContain("SUMMARY:MRI knee at Synthetic Imaging");
  });
  it("uses the window for morning and afternoon times", () => {
    const body = decodeURIComponent(calendarFile({ ...request, approved_slot: { date: "2026-12-02", period: "afternoon" } }).href.split(",")[1]);
    expect(body).toContain("DTSTART:20261202T120000");
    expect(body).toContain("DTEND:20261202T170000");
  });
  it("returns nothing without a recorded time", () => {
    expect(calendarFile({ ...base, approved_slot: null })).toBeNull();
  });
});
