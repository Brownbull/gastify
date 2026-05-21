import {
  formatDate,
  formatMinorAmount,
  formatTimestamp,
  getCurrencyExponent,
  majorInputToMinor,
  minorToMajorInput,
} from "../format";

describe("getCurrencyExponent", () => {
  it("returns 0 for zero-decimal currencies like CLP", () => {
    expect(getCurrencyExponent("CLP")).toBe(0);
  });

  it("returns 2 for standard currencies like USD", () => {
    expect(getCurrencyExponent("USD")).toBe(2);
  });

  it("is case-insensitive", () => {
    expect(getCurrencyExponent("usd")).toBe(2);
  });

  it("defaults to 2 for unrecognized currencies", () => {
    expect(getCurrencyExponent("ZZZ")).toBe(2);
  });
});

describe("formatMinorAmount", () => {
  it("formats CLP zero-decimal amounts", () => {
    const result = formatMinorAmount(102052, "CLP");
    expect(result).toMatch(/102[,.]?052/);
  });

  it("formats USD two-decimal amounts", () => {
    const result = formatMinorAmount(1050, "USD");
    expect(result).toMatch(/10[.,]50/);
  });

  it("defaults to CLP when no currency provided", () => {
    const result = formatMinorAmount(5000);
    expect(result).toMatch(/5[,.]?000/);
  });

  it("returns a fallback string for invalid currencies", () => {
    const result = formatMinorAmount(100, "ZZZ");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

describe("minorToMajorInput", () => {
  it("converts CLP minor (integer) to string without decimals", () => {
    expect(minorToMajorInput(5000, "CLP")).toBe("5000");
  });

  it("converts USD minor to major with two decimal places", () => {
    expect(minorToMajorInput(1050, "USD")).toBe("10.50");
  });
});

describe("majorInputToMinor", () => {
  it("converts CLP major input to minor", () => {
    expect(majorInputToMinor("5000", "CLP")).toBe(5000);
  });

  it("converts USD major input to minor with rounding", () => {
    expect(majorInputToMinor("10.50", "USD")).toBe(1050);
  });

  it("handles comma as decimal separator", () => {
    expect(majorInputToMinor("10,50", "USD")).toBe(1050);
  });

  it("returns null for empty string", () => {
    expect(majorInputToMinor("", "USD")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(majorInputToMinor("abc", "USD")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(majorInputToMinor("   ", "USD")).toBeNull();
  });

  it("rounds fractional minor amounts correctly", () => {
    expect(majorInputToMinor("10.555", "USD")).toBe(1056);
  });
});

describe("formatDate", () => {
  it("formats a YYYY-MM-DD date string", () => {
    const result = formatDate("2026-05-20");
    expect(result).toMatch(/20/);
    expect(result).toMatch(/2026/);
  });

  it("returns a string for invalid date input without throwing", () => {
    expect(typeof formatDate("not-a-date")).toBe("string");
  });
});

describe("formatTimestamp", () => {
  it("formats an ISO timestamp", () => {
    const result = formatTimestamp("2026-05-20T12:30:00Z");
    expect(result).toMatch(/2026/);
  });

  it("returns a string for invalid timestamp input without throwing", () => {
    expect(typeof formatTimestamp("nope")).toBe("string");
  });
});
