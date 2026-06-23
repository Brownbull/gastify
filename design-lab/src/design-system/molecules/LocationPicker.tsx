import { useState } from "react";
import { Modal } from "@design-system/atoms/Modal";
import { PixelIcon } from "@design-system/assets/PixelIcon";

/**
 * LocationPicker — full-screen city picker (DM, legacy style). The user always
 * picks a CITY; cities are grouped under their country header. Chile dominates
 * the fixture since gastify is a Chilean app. An optional search input filters
 * the visible cities across every country by simple name match.
 *
 * Presentational: selecting a city commits via onSelect then closes via onClose;
 * the real app would lift the chosen city to a store.
 */
export interface LocationPickerProps {
  open: boolean;
  onClose: () => void;
  selectedCity: string;
  onSelect: (city: string) => void;
}

interface Country {
  country: string;
  /** short text label stand-in for a flag (no flag images). */
  flag?: string;
  cities: string[];
}

const COUNTRIES: Country[] = [
  {
    country: "Chile",
    flag: "CL",
    cities: ["Villarrica", "Pucón", "Temuco", "Santiago", "Valdivia", "Osorno"],
  },
  {
    country: "Argentina",
    flag: "AR",
    cities: ["Bariloche", "Mendoza", "Buenos Aires"],
  },
  {
    country: "Perú",
    flag: "PE",
    cities: ["Lima", "Cusco"],
  },
];

function matchesQuery(city: string, query: string): boolean {
  return city.toLowerCase().includes(query.trim().toLowerCase());
}

function CityRow({ city, selected, onClick }: { city: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-gt-12 rounded-gt-xl border-2 px-gt-12 py-gt-10 text-left transition duration-150 ease-gt-bounce hover:-translate-y-0.5 ${
        selected
          ? "border-gt-line-strong bg-gt-primary text-white shadow-gt-sm"
          : "border-gt-line bg-gt-surface text-gt-ink shadow-gt-xs hover:bg-gt-bg-3"
      }`}
    >
      <PixelIcon name="nav-home" size={20} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-gt-md font-extrabold">{city}</span>
    </button>
  );
}

export function LocationPicker({ open, onClose, selectedCity, onSelect }: LocationPickerProps) {
  const [query, setQuery] = useState("");

  const choose = (city: string) => {
    onSelect(city);
    onClose();
  };

  const groups = COUNTRIES.map((c) => ({
    ...c,
    cities: c.cities.filter((city) => matchesQuery(city, query)),
  })).filter((c) => c.cities.length > 0);

  return (
    <Modal open={open} onClose={onClose} title="Ubicación">
      <div className="flex flex-col gap-gt-12">
        <label className="flex items-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-8 shadow-gt-xs focus-within:ring-4 focus-within:ring-gt-primary/25">
          <PixelIcon name="action-search" size={18} className="shrink-0 text-gt-ink-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ciudad…"
            className="min-w-0 flex-1 bg-transparent text-gt-md font-bold text-gt-ink placeholder:text-gt-ink-3 focus-visible:outline-none"
          />
        </label>

        {groups.length === 0 ? (
          <p className="px-gt-4 py-gt-8 text-gt-sm font-bold text-gt-ink-3">
            No hay ciudades para «{query.trim()}».
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.country} className="flex flex-col gap-gt-8">
              <header className="flex items-center gap-gt-8 px-gt-4 pt-gt-4">
                <span className="font-gt-display text-gt-xs font-extrabold uppercase text-gt-ink-3">
                  {group.country}
                </span>
                {group.flag ? (
                  <span className="rounded-gt-pill border-2 border-gt-line bg-gt-bg-3 px-gt-6 text-gt-xs font-extrabold text-gt-ink-3">
                    {group.flag}
                  </span>
                ) : null}
              </header>
              <div className="flex flex-col gap-gt-8">
                {group.cities.map((city) => (
                  <CityRow
                    key={`${group.country}-${city}`}
                    city={city}
                    selected={city === selectedCity}
                    onClick={() => choose(city)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </Modal>
  );
}
