import { describe, expect, it } from "vitest";
import {
  currentPeriodKey,
  granularityOfKey,
  isoWeekMonday,
  monthKeyOf,
  shiftPeriodKey,
} from "./periodKeys";

describe("periodKeys", () => {
  it("currentPeriodKey produces backend-compatible forms", () => {
    const d = new Date(2026, 5, 10); // 2026-06-10, ISO week 24
    expect(currentPeriodKey("week", d)).toBe("2026-W24");
    expect(currentPeriodKey("month", d)).toBe("2026-06");
    expect(currentPeriodKey("quarter", d)).toBe("2026-Q2");
    expect(currentPeriodKey("year", d)).toBe("2026");
  });

  it("ISO week math matches Python fromisocalendar at the year boundary", () => {
    // 2026-W01 starts Monday 2025-12-29 (mirrors the backend contract test).
    const monday = isoWeekMonday(2026, 1);
    expect(monday.toISOString().slice(0, 10)).toBe("2025-12-29");
    // Dec 29 2025 belongs to ISO 2026-W01.
    expect(currentPeriodKey("week", new Date(2025, 11, 29))).toBe("2026-W01");
  });

  it("shiftPeriodKey steps each granularity incl. week/year rollover", () => {
    expect(shiftPeriodKey("2026-W24", 1)).toBe("2026-W25");
    expect(shiftPeriodKey("2026-W01", -1)).toBe("2025-W52"); // 2025 has 52 weeks
    expect(shiftPeriodKey("2026-01", -1)).toBe("2025-12");
    expect(shiftPeriodKey("2026-Q1", -1)).toBe("2025-Q4");
    expect(shiftPeriodKey("2026", 1)).toBe("2027");
  });

  it("granularityOfKey + monthKeyOf round-trip", () => {
    expect(granularityOfKey("2026-W05")).toBe("week");
    expect(monthKeyOf("2026-W01")).toBe("2025-12"); // boundary week starts in December
    expect(monthKeyOf("2026-Q3")).toBe("2026-07");
    expect(monthKeyOf("2026")).toBe("2026-01");
  });
});
