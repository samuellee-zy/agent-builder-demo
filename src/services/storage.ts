
import { Agent } from '../types';
import { get, set } from 'idb-keyval';

const STORAGE_KEY = 'agent_builder_data_v1';

/**
 * Saves the list of agents to IndexedDB (No 5MB limit).
 */
export const saveAgentsToStorage = async (agents: Agent[]): Promise<void> => {
  try {
    // No need to serialize manually, idb-keyval handles structured cloning
    // But we might want to ensure it's clean JSON-compatible data if we have complex objects
    // For now, direct save is fine and much more efficient.
    await set(STORAGE_KEY, agents);
    console.log('Agents saved to IndexedDB');
  } catch (error) {
    console.error('Failed to save agents to storage:', error);
    alert("Failed to save data to disk. Please check your available disk space.");
  }
};

/**
 * Loads agents from IndexedDB.
 */
export const loadAgentsFromStorage = async (): Promise<Agent[]> => {
  try {
    // Try loading from IndexedDB first
    const agents = await get<Agent[]>(STORAGE_KEY);

    if (agents) {
      // Hydrate dates if they were stored as strings (legacy) or just return
      // IndexedDB stores Date objects natively, so we might not need hydration if we saved them as Dates.
      // But if we migrated from localStorage, we might need to handle strings.
      // Let's assume we might get strings if we just migrated.
      return agents.map(hydrateDates);
    }

    // FALLBACK: Check LocalStorage for migration
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      console.log("Migrating data from LocalStorage to IndexedDB...");
      const parsed = JSON.parse(legacy, (key, value) => {
        if ((key === 'createdAt' || key === 'timestamp') && typeof value === 'string') {
          const date = new Date(value);
            if (!isNaN(date.getTime())) return date;
          }
          return value;
        });

      // Save to IDB
      await set(STORAGE_KEY, parsed);
      // Clear LocalStorage to free up space
      localStorage.removeItem(STORAGE_KEY);
      return parsed;
    }

    return [];
  } catch (error) {
    console.error('Failed to load agents from storage:', error);
    return [];
  }
};

// Helper to recursively hydrate dates in an object/array
const hydrateDates = (obj: any): any => {
  if (obj instanceof Date) return obj;
  if (typeof obj === 'string') {
    // Simple heuristic for ISO dates
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
