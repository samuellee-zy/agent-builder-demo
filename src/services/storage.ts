/**
 * @file src/services/storage.ts
 * @description Persistence Layer using IndexedDB.
 * 
 * Why IndexedDB?
 * LocalStorage is synchronous and limited to ~5MB.
 * Rich media (base64 images) in chat history can easily exceed this limit.
 * IndexedDB is asynchronous and supports much larger storage quotas.
 */

import { Agent } from '../types';
import { get, set } from 'idb-keyval';

const STORAGE_KEY = 'agent_builder_data_v1';

/**
 * Saves the list of agents to IndexedDB.
 * Uses `idb-keyval` for a simple Promise-based API.
 * 
 * NOTE: IndexedDB supports storing complex objects (Dates, Blobs, Arrays) directly,
 * unlike LocalStorage which requires JSON serialization.
 * 
 * @param agents - Array of Agent objects to persist.
 */
export const saveAgentsToStorage = async (agents: Agent[]): Promise<void> => {
  try {
    // idb-keyval uses Structured Clone Algorithm, so it handles complex objects efficiently.
    await set(STORAGE_KEY, agents);
    console.log('Agents saved to IndexedDB');
  } catch (error) {
    console.error('Failed to save agents to storage:', error);
    alert("Failed to save data to disk. Please check your available disk space.");
  }
};

/**
 * Loads agents from IndexedDB, with a fallback migration from LocalStorage.
 * 
 * Migration Logic:
 * 1. Check IDB first.
 * 2. If empty, check LocalStorage (legacy location).
 * 3. If found in LocalStorage, migrate to IDB and clear LocalStorage.
 * 
 * @returns {Promise<Agent[]>} List of agents.
 */
export const loadAgentsFromStorage = async (): Promise<Agent[]> => {
  try {
    // 1. Try loading from IndexedDB
    const agents = await get<Agent[]>(STORAGE_KEY);

    if (agents) {
      // Hydrate Date objects if they were serialized as strings (e.g. from JSON import/export)
      return agents.map(hydrateDates);
    }

    // 2. FALLBACK: Check LocalStorage for migration
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      console.log("Migrating data from LocalStorage to IndexedDB...");
      const parsed = JSON.parse(legacy, (key, value) => {
        // Custom reviver for basic Date strings
        if ((key === 'createdAt' || key === 'timestamp') && typeof value === 'string') {
          const date = new Date(value);
            if (!isNaN(date.getTime())) return date;
          }
          return value;
        });

      // 3. Save to IDB & Clean up
      await set(STORAGE_KEY, parsed);
      localStorage.removeItem(STORAGE_KEY);
      return parsed;
    }

    return [];
  } catch (error) {
    console.error('Failed to load agents from storage:', error);
    return [];
  }
};

/**
 * Recursively traverses an object to convert ISO Date strings back into Date objects.
 * Essential for correct timestamp handling after JSON deserialization,
 * especially when migrating from LocalStorage or importing JSON files.
 * 
 * @param obj - The object to hydrate.
 * @returns The object with Date strings converted to Date instances.
 */
const hydrateDates = (obj: any): any => {
  if (obj instanceof Date) return obj;
  if (typeof obj === 'string') {
    // Simple heuristic for ISO dates used in this app
    if (obj.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      const d = new Date(obj);
      if (!isNaN(d.getTime())) return d;
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(hydrateDates);
  if (typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = hydrateDates(obj[key]);
    }
    return newObj;
  }
  return obj;
};
