/**
 * SubcategoryMappingsList — thin wrapper around generic MappingsList<T>.
 * Story 15-3b: Replaces 581-line component with config-driven generic.
 *
 * Note: Uses `onUpdateMapping` prop (not `onEditMapping`) for backward compatibility.
 *
 * @module SubcategoryMappingsList
 * @see Story 9.15, 15-3b
 */

import React from 'react';
import type { SubcategoryMapping } from '@/types/subcategoryMapping';
import { MappingsList } from '@/components/shared/MappingsList';
import { subcategoryMappingsConfig } from '@/components/shared/mappingsListConfigs';

export interface SubcategoryMappingsListProps {
  mappings: SubcategoryMapping[];
  loading: boolean;
  onDeleteMapping: (mappingId: string) => Promise<void>;
  onUpdateMapping: (mappingId: string, newSubcategory: string) => Promise<void>;
  t: (key: string) => string;
  theme?: 'light' | 'dark';
}

export const SubcategoryMappingsList: React.FC<SubcategoryMappingsListProps> = ({
  onUpdateMapping,
  ...props
}) => (
  <MappingsList
    {...props}
    onEditMapping={onUpdateMapping}
    config={subcategoryMappingsConfig}
  />
);
