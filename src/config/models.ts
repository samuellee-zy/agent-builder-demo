/**
 * @file src/config/models.ts
 * @description Frontend Adapter for Shared Model Configuration.
 * 
 * Imports the shared `config/models.json` and exports it for the UI.
 * Filters out 'hidden' models.
 */

import modelsConfig from '../../config/models.json';

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  hidden?: boolean;
}

// Export only visible models for the UI Dropdown
export const AVAILABLE_MODELS: ModelOption[] = (modelsConfig as any[]).filter(m => !m.hidden).map(m => ({
  id: m.id,
  name: m.name,
  description: m.description
}));
