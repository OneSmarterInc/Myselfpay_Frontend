import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PriceForm } from "../src/CenterWorkspace.jsx";

const center = (extra) => ({ id: "k1", name: "Test Imaging", mri: "", ct: "", other: "", ...extra });
const html = (c) => renderToStaticMarkup(<PriceForm center={c} submissions={[]} live={[]} />);

describe("center portal shows the prices stored in the directory", () => {
  it("lists the stored MRI and CT price text so the center can change it", () => {
    const out = html(center({ mri: "MRI without contrast $450", ct: "CT $300 with contrast" }));
    expect(out).toContain("Shown to patients now");
    expect(out).toContain("MRI without contrast $450");
    expect(out).toContain("CT $300 with contrast");
  });
  it("shows nothing extra when the center has no stored price", () => {
    const out = html(center({ mri: "Call for pricing" }));
    expect(out).not.toContain("Shown to patients now");
  });
});
