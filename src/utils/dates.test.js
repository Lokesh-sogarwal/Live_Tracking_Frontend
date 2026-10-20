import { toLocalYYYYMMDD } from "./dates";

// Run with TZ=Asia/Kolkata: toISOString() returned the previous day for these inputs.
describe("toLocalYYYYMMDD", () => {
  it("keeps the local calendar day for local midnight (react-calendar values)", () => {
    expect(toLocalYYYYMMDD(new Date(2026, 9, 20))).toBe("2026-10-20");
  });

  it("keeps the local day early in the morning", () => {
    expect(toLocalYYYYMMDD(new Date(2026, 9, 20, 3, 15))).toBe("2026-10-20");
  });

  it("passes through YYYY-MM-DD strings and rejects invalid input", () => {
    expect(toLocalYYYYMMDD("2026-01-05")).toBe("2026-01-05");
    expect(toLocalYYYYMMDD("not a date")).toBe("");
  });
});
