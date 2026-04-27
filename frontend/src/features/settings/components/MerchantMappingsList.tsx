/**
 * MerchantMappingsList — thin wrapper around generic MappingsList<T>.
 * Story 15-3b: Replaces 474-line component with config-driven generic.
 *
 * @module MerchantMappingsList
 * @see Story 9.7, 14.22, 15-3b
 */

import React from 'react';
import type { MerchantMapping } from '@/types/merchantMapping';
import { MappingsList } from '@/components/shared/MappingsList';
import { merchantMappingsConfig } from '@/components/shared/mappingsListConfigs';

export interface MerchantMappingsListProps {
  mappings: MerchantMapping[];
  loading: boolean;
  onDeleteMapping: (mappingId: string) => Promise<void>;
  onEditMapping: (mappingId: string, newTarget: string) => Promise<void>;
  t: (key: string) => string;
  theme?: 'light' | 'dark';
}

export const MerchantMappingsList: React.FC<MerchantMappingsListProps> = (props) => (
  <MappingsList {...props} config={merchantMappingsConfig} />
);
