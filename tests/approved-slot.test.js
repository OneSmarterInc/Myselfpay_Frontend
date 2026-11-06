import {describe,it,expect} from "vitest";
import {approvedSlotLabel,approvalReady} from "../src/approved-slot.js";
describe("approved appointment display",()=>{
 it("requires a complete selection",()=>{expect(approvalReady(null)).toBe(false);expect(approvalReady({date:"2026-11-15",time:""})).toBe(false);expect(approvalReady({preferred_index:0})).toBe(true);expect(approvalReady({date:"2026-11-15",time:"14:30"})).toBe(true)});
 it("formats approved windows and exact local times",()=>{expect(approvedSlotLabel({date:"2026-11-15",period:"morning",timezone:"America/New_York"})).toContain("Morning (8 am–12 pm)");expect(approvedSlotLabel({date:"2026-11-15",time:"14:30",timezone:"America/New_York"})).toContain("2:30 PM · Eastern time");expect(approvedSlotLabel(null)).toContain("not recorded")});
});
