import { describe, it, expect } from "vitest";
import { countryToFlag, transactionLocationLabel } from "./locationDisplay";

describe("countryToFlag", () => {
  it("maps an ISO alpha-2 code to its flag emoji", () => {
    expect(countryToFlag("US")).toBe("🇺🇸");
    expect(countryToFlag("cl")).toBe("🇨🇱");
    expect(countryToFlag("FR")).toBe("🇫🇷");
    expect(countryToFlag("GB")).toBe("🇬🇧");
  });
  it("passes non-ISO input through (uppercased)", () => {
    expect(countryToFlag("Chile")).toBe("CHILE");
  });
});

describe("transactionLocationLabel", () => {
  it("returns null without a country", () => {
    expect(transactionLocationLabel(null, "Orlando", "CL", "flag")).toBeNull();
  });
  it("foreign + flag → 'City 🇺🇸'", () => {
    expect(transactionLocationLabel("US", "Orlando", "CL", "flag")).toBe("Orlando 🇺🇸");
  });
  it("foreign + code → 'City, US'", () => {
    expect(transactionLocationLabel("US", "Orlando", "CL", "code")).toBe("Orlando, US");
  });
  it("home country is never flagged", () => {
    expect(transactionLocationLabel("CL", "Pucón", "CL", "flag")).toBe("Pucón, CL");
    expect(transactionLocationLabel("cl", "Pucón", "CL", "flag")).toBe("Pucón, CL");
  });
  it("no home country → treated as home (plain code)", () => {
    expect(transactionLocationLabel("US", "Orlando", "", "flag")).toBe("Orlando, US");
  });
  it("country only, no city", () => {
    expect(transactionLocationLabel("US", null, "CL", "flag")).toBe("🇺🇸");
    expect(transactionLocationLabel("US", null, "CL", "code")).toBe("US");
  });
});
