

import { Agent } from '../types';

const STORAGE_KEY = 'agent_builder_data_v1';

/**
 * Saves the list of agents to the browser's LocalStorage.
 */
export const saveAgentsToStorage = (agents: Agent[]): void => {
  try {
    const serialized = JSON.stringify(agents);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save agents to storage:', error);
  }
};

/**
 * Loads agents from LocalStorage, hydrating Date objects correctly.
 */
export const loadAgentsFromStorage = (): Agent[] => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return [];

    return JSON.parse(serialized, (key, value) => {
      // Hydrate ISO date strings back into Date objects
      if ((key === 'createdAt' || key === 'timestamp') && typeof value === 'string') {
        const date = new Date(value);
        // Check if valid date
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      return value;
    });
  } catch (error) {
    console.error('Failed to load agents from storage:', error);
    return [];
  }
};