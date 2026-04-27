/**
 * ItemNameMappingsList — thin wrapper around generic MappingsList<T>.
 * Story 15-3b: Replaces 551-line component with config-driven generic.
 *
 * @module ItemNameMappingsList
 * @see Phase 5 Item Name Mappings, 15-3b
 */

import React from 'react';
import type { ItemNameMapping } from '@/types/itemNameMapping';
import { MappingsList } from '@/components/shared/MappingsList';
import { itemNameMappingsConfig } from '@/components/shared/mappingsListConfigs';

export interface ItemNameMappingsListProps {
  mappings: ItemNameMapping[];
  loading: boolean;
  onDeleteMapping: (mappingId: string) => Promise<void>;
  onEditMapping: (mappingId: string, newTarget: string) => Promise<void>;
  t: (key: string) => string;
  theme?: 'light' | 'dark';
}

export const ItemNameMappingsList: React.FC<ItemNameMappingsListProps> = (props) => (
  <MappingsList {...props} config={itemNameMappingsConfig} />
);
