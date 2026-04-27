/**
 * LocationTabSection — Country→City location filter tree
 *
 * Story 15b-2p: Extracted from IconCategoryFilter.tsx
 * Props-only component — no direct store access, no hook calls.
 * Parent passes getCountryName/getCityName as function props.
 */

import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import type { Language } from '@/utils/translations';
import type { AvailableFilters } from '@shared/utils/historyFilterUtils';

export interface LocationTabSectionProps {
  sortedCountries: string[];
  availableFilters: AvailableFilters;
  expandedCountries: Set<string>;
  pendingLocations: Set<string>;
  getCountryName: (code: string) => string;
  getCityName: (code: string) => string;
  getCountrySelectionState: (country: string) => 'all' | 'some' | 'none';
  toggleCountryExpansion: (country: string) => void;
  handleCountryToggle: (country: string) => void;
  handleCityToggle: (city: string) => void;
  t: (key: string) => string;
  lang: Language;
}

export function LocationTabSection({
  sortedCountries,
  availableFilters,
  expandedCountries,
  pendingLocations,
  getCountryName,
  getCityName,
  getCountrySelectionState,
  toggleCountryExpansion,
  handleCountryToggle,
  handleCityToggle,
  t,
  lang,
}: LocationTabSectionProps): React.ReactElement {
  return (
    <div className="space-y-1">
      {sortedCountries.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {t('noLocationData') || (lang === 'es' ? 'Sin datos de ubicación' : 'No location data')}
        </div>
      ) : (
        sortedCountries.map(country => {
          const cities = availableFilters.citiesByCountry[country] || [];
          const isExpanded = expandedCountries.has(country);
          const selectionState = getCountrySelectionState(country);
          const hasCities = cities.length > 0;

          return (
            <div key={country} className="rounded-lg overflow-hidden">
              {/* Country Row */}
              <div
                className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-tertiary)]"
                onClick={() => hasCities ? toggleCountryExpansion(country) : handleCountryToggle(country)}
              >
                {hasCities ? (
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                ) : (
                  <span className="w-4" />
                )}

                <span
                  className="flex-1 text-sm font-medium flex items-center gap-1.5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <CountryFlag country={country} size="small" />
                  {getCountryName(country)}
                </span>

                {hasCities && (
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {cities.length}
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCountryToggle(country);
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    backgroundColor: selectionState === 'all'
                      ? 'var(--primary)'
                      : selectionState === 'some'
                        ? 'var(--warning, #f59e0b)'
                        : 'transparent',
                    border: selectionState !== 'none'
                      ? 'none'
                      : '2px solid var(--border-medium)',
                  }}
                  aria-label={lang === 'es'
                    ? `Seleccionar todas las ciudades de ${getCountryName(country)}`
                    : `Select all cities in ${getCountryName(country)}`
                  }
                >
                  {selectionState !== 'none' && (
                    <Check size={12} strokeWidth={3} color="white" />
                  )}
                </button>
              </div>

              {/* Cities (expanded) */}
              {isExpanded && hasCities && (
                <div className="ml-6 pl-2 border-l space-y-0.5" style={{ borderColor: 'var(--border-light)' }}>
                  {[...cities]
                    .sort((a, b) => getCityName(a).localeCompare(getCityName(b), lang))
                    .map(city => {
                      const isSelected = pendingLocations.has(city);
                      return (
                        <button
                          key={city}
                          onClick={() => handleCityToggle(city)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors hover:bg-[var(--bg-tertiary)]"
                        >
                          <span
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{
                              backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                              border: isSelected ? 'none' : '2px solid var(--border-medium)',
                            }}
                          >
                            {isSelected && (
                              <Check size={10} strokeWidth={3} color="white" />
                            )}
                          </span>

                          <span
                            className="text-sm"
                            style={{
                              color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                              fontWeight: isSelected ? 500 : 400,
                            }}
                          >
                            {getCityName(city)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
