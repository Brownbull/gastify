/**
 * CategoryMappingsList — thin wrapper around generic MappingsList<T>.
 * Story 15-3b: Replaces 632-line component with config-driven generic.
 *
 * @module CategoryMappingsList
 * @see Story 6.5, 9.7, 15-3b
 */

import React from 'react';
import type { CategoryMapping } from '@/types/categoryMapping';
import { MappingsList } from '@/components/shared/MappingsList';
import { categoryMappingsConfig } from '@/components/shared/mappingsListConfigs';

export interface CategoryMappingsListProps {
  mappings: CategoryMapping[];
  loading: boolean;
  onDeleteMapping: (mappingId: string) => Promise<void>;
  onEditMapping?: (mappingId: string, newCategory: string) => Promise<void>;
  t: (key: string) => string;
  theme?: 'light' | 'dark';
}

const noopEdit = async (_id: string, _val: string) => {};

export const CategoryMappingsList: React.FC<CategoryMappingsListProps> = ({
  onEditMapping,
  ...props
}) => (
  <MappingsList
    {...props}
    onEditMapping={onEditMapping || noopEdit}
    config={categoryMappingsConfig}
  />
);
