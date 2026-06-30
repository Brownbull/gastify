"""Scan-location reconciliation — the agreed 4-case rule.

Tested against a small fixture dataset so the algorithm is proven independently
of the curated app/reference/locations.json content.
"""

from __future__ import annotations

import re

from app.services.locations import (
    cities_of,
    known_countries,
    location_dataset,
    resolve_scan_location,
)

FIXTURE = {
    "CL": {
        "name": "Chile",
        "capital": "Santiago",
        "cities": ["Santiago", "Puente Alto", "Viña del Mar", "Concepción"],
    },
    "US": {
        "name": "United States",
        "capital": "Washington",
        "cities": ["Washington", "New York", "Los Angeles"],
    },
}

DEFAULT_COUNTRY = "CL"
DEFAULT_CITY = "Providencia"


def _resolve(country: str | None, city: str | None) -> tuple[str | None, str | None]:
    return resolve_scan_location(
        country=country,
        city=city,
        default_country=DEFAULT_COUNTRY,
        default_city=DEFAULT_CITY,
        dataset=FIXTURE,
    )


# --- Case 1: country + city ---------------------------------------------------
def test_country_and_known_city_used_as_is() -> None:
    assert _resolve("CL", "Viña del Mar") == ("CL", "Viña del Mar")


def test_country_and_unknown_city_falls_back_to_capital() -> None:
    # Pucón isn't in our DB for CL -> use the capital.
    assert _resolve("CL", "Pucón") == ("CL", "Santiago")


def test_known_city_is_canonicalized() -> None:
    # case/accent-insensitive match returns the dataset's spelling.
    assert _resolve("CL", "viña del mar") == ("CL", "Viña del Mar")
    assert _resolve("us", "new york") == ("US", "New York")


# --- Case 2: country only -----------------------------------------------------
def test_country_only_uses_capital() -> None:
    assert _resolve("US", None) == ("US", "Washington")
    assert _resolve("CL", "  ") == ("CL", "Santiago")


# --- Case 3: city only (ambiguous) -------------------------------------------
def test_city_only_uses_settings_default() -> None:
    assert _resolve(None, "New York") == ("CL", "Providencia")


# --- Case 4: neither ----------------------------------------------------------
def test_neither_uses_settings_default() -> None:
    assert _resolve(None, None) == ("CL", "Providencia")
    assert _resolve("", "") == ("CL", "Providencia")


# --- Uncovered country (outside operating regions) ----------------------------
def test_uncovered_country_uses_settings_default() -> None:
    # JP is not in our regions -> treat as unknown -> default.
    assert _resolve("JP", "Tokyo") == ("CL", "Providencia")


# --- Malformed inputs ---------------------------------------------------------
def test_non_iso_country_is_ignored() -> None:
    assert _resolve("Chile", "Santiago") == ("CL", "Providencia")


# --- Dropdown helpers ---------------------------------------------------------
def test_known_countries_sorted_by_name() -> None:
    assert known_countries(FIXTURE) == [
        {"code": "CL", "name": "Chile"},
        {"code": "US", "name": "United States"},
    ]


def test_cities_of_returns_country_cities() -> None:
    assert cities_of("cl", FIXTURE)[0] == "Santiago"
    assert cities_of("ZZ", FIXTURE) == []


# --- Shipped dataset invariants (app/reference/locations.json) ----------------
def test_shipped_dataset_invariants() -> None:
    data = location_dataset()
    assert len(data) >= 40, "expected the curated operating-region coverage"
    assert len(data["CL"]["cities"]) == 346, "Chile must carry all 346 official comunas"
    for code, entry in data.items():
        assert re.fullmatch(r"[A-Z]{2}", code), f"non ISO-alpha-2 key: {code}"
        assert entry["name"] and entry["capital"] and entry["cities"], f"{code}: empty field"
        assert entry["capital"] in entry["cities"], f"{code}: capital not in cities"
        assert len(entry["cities"]) == len(set(entry["cities"])), f"{code}: duplicate cities"
