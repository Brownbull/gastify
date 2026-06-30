"""Location dataset + scan-location reconciliation.

The scan extraction returns a best-effort ``(country, city)`` read from the
receipt (see ``app/agents/extraction.py``). This module reconciles that against
the user's settings default location and a static dataset of
``country -> {name, capital, cities}`` (``app/reference/locations.json``, ISO
3166-1 alpha-2 keyed), following the agreed 4-case rule:

==========================  ========================================================
Scan result                 Resolved location
==========================  ========================================================
country + city              use them; if the city is not in our DB for that country,
                            use the country's capital instead
country only                the country's capital
city only                   ambiguous -> the settings default
neither                     the settings default
==========================  ========================================================

A country we don't cover (outside the operating regions) is treated as an
unknown country -> settings default, since we can neither validate the city nor
supply a capital for it.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import TypedDict

_DATA_PATH = Path(__file__).resolve().parent.parent / "reference" / "locations.json"


class CountryLocation(TypedDict):
    name: str
    capital: str
    cities: list[str]


LocationDataset = dict[str, CountryLocation]


@lru_cache(maxsize=1)
def location_dataset() -> LocationDataset:
    """Load the static location dataset (ISO alpha-2 -> {name, capital, cities})."""
    with _DATA_PATH.open(encoding="utf-8") as handle:
        data: LocationDataset = json.load(handle)
    return data


def _norm_country(value: str | None) -> str | None:
    code = (value or "").strip().upper()
    return code if len(code) == 2 and code.isalpha() else None


def _norm_city(value: str | None) -> str | None:
    city = (value or "").strip()
    return city or None


def _canonical_city(city: str, cities: list[str]) -> str | None:
    """The dataset's canonical spelling of ``city`` (case/accent-insensitive), or None."""
    target = city.strip().casefold()
    for known in cities:
        if known.casefold() == target:
            return known
    return None


def resolve_scan_location(
    *,
    country: str | None,
    city: str | None,
    default_country: str | None,
    default_city: str | None,
    dataset: LocationDataset | None = None,
) -> tuple[str | None, str | None]:
    """Reconcile a scanned ``(country, city)`` to a stored pair per the 4-case rule."""
    data = dataset if dataset is not None else location_dataset()
    country = _norm_country(country)
    city = _norm_city(city)

    entry = data.get(country) if country else None
    if country and entry is not None:
        canonical = _canonical_city(city, entry["cities"]) if city else None
        if canonical is not None:
            return country, canonical
        # country known; city absent or not in our DB -> the country's capital
        return country, entry["capital"]

    # country absent, or a code we don't cover -> the user's settings default
    return _norm_country(default_country), _norm_city(default_city)


def known_countries(dataset: LocationDataset | None = None) -> list[dict[str, str]]:
    """[{code, name}] sorted by name — feeds the settings country dropdown."""
    data = dataset if dataset is not None else location_dataset()
    return sorted(
        ({"code": code, "name": entry["name"]} for code, entry in data.items()),
        key=lambda country: country["name"],
    )


def cities_of(country: str | None, dataset: LocationDataset | None = None) -> list[str]:
    """Cities for a country code — feeds the settings city dropdown."""
    data = dataset if dataset is not None else location_dataset()
    entry = data.get(_norm_country(country) or "")
    return list(entry["cities"]) if entry else []
