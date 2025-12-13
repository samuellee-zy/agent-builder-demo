/**
 * @file server/config/models.js
 * @description Backend Adapter for Shared Model Configuration.
 * 
 * Imports the shared `config/models.json` and transforms it into the
 * `MODEL_CONFIG` map expected by the Vertex AI Proxy.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const modelsConfig = require('../../config/models.json');

// Transform JSON Array into Map: ID -> { location, modelId, protocol }
const MODEL_CONFIG = modelsConfig.reduce((acc, model) => {
  acc[model.id] = {
    location: model.backend.location,
    modelId: model.backend.modelId,
    protocol: model.backend.protocol
  };
  return acc;
}, {});

// Add aliases if needed (e.g. gemini-3-pro -> gemini-3-pro-preview)
// These can be explicit in the JSON too, but keeping minimal legacy support here
MODEL_CONFIG['gemini-3.0-pro-preview'] = MODEL_CONFIG['gemini-3-pro-preview'];
MODEL_CONFIG['gemini-3-pro'] = MODEL_CONFIG['gemini-3-pro-preview'];

export default MODEL_CONFIG;
