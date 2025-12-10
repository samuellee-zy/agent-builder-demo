

import { Agent } from '../types';

const STORAGE_KEY = 'agent_builder_data_v1';

/**
 * Prunes data to fit within LocalStorage quotas.
 * Strategy:
 * 1. Remove oldest evaluations.
 * 2. Remove oldest sessions.
 * 3. Truncate messages in remaining sessions.
 */
const pruneData = (agents: Agent[]): Agent[] => {
  console.warn("Storage quota exceeded. Pruning data...");
  
  return agents.map(agent => {
    // 1. Keep only last 5 evaluations
    let evals = agent.evaluations || [];
    if (evals.length > 5) {
      evals = evals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
    }

    // 2. Keep only last 5 sessions
    let sessions = agent.sessions || [];
    if (sessions.length > 5) {
      sessions = sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
    }

    // 3. Truncate very long session histories (keep last 20 messages)
    sessions = sessions.map(s => ({
      ...s,
      messages: s.messages.length > 20 ? s.messages.slice(-20) : s.messages
    }));

    return {
      ...agent,
      evaluations: evals,
      sessions: sessions
    };
  });
};

/**
 * Saves the list of agents to the browser's LocalStorage.
 * Handles QuotaExceededError by attempting to prune data.
 */
export const saveAgentsToStorage = (agents: Agent[]): void => {
  try {
    const serialized = JSON.stringify(agents);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error: any) {
    if (error.name === 'QuotaExceededError' || error.code === 22) {
       console.warn("LocalStorage quota exceeded. Attempting to prune...");
       try {
           const pruned = pruneData(agents);
           localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
           console.log("Data pruned and saved successfully.");
       } catch (retryError) {
           console.error("Failed to save even after pruning:", retryError);
           alert("Storage full! Unable to save recent changes. Please delete old agents or sessions.");
       }
    } else {
        console.error('Failed to save agents to storage:', error);
    }
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
