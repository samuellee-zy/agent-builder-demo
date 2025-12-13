/**
 * @file server/config/models.js
 * @description Backend Adapter for Shared Model Configuration.
 * 
 * Imports the shared `config/models.json` and transforms it into the
 * `MODEL_CONFIG` map expected by the Vertex AI Proxy.
 */

// Inlined configuration to ensure Cloud Run stability
const modelsConfig = [
  {
    "id": "gemini-live-2.5-flash-native-audio",
    "name": "Gemini 2.5 Flash Live",
    "description": "Native Audio model for real-time voice & video.",
    "backend": {
      "location": "us-central1",
      "modelId": "gemini-live-2.5-flash-native-audio",
      "protocol": "websocket"
    }
  },
  {
    "id": "gemini-2.5-flash",
    "name": "Gemini 2.5 Flash",
    "description": "Fast, cost-efficient, low latency.",
    "backend": {
      "location": "global",
      "modelId": "gemini-2.5-flash",
      "protocol": "http"
    }
  },
  {
    "id": "gemini-flash-lite-latest",
    "name": "Gemini 2.5 Flash Lite",
    "description": "Extremely cost-effective, high throughput.",
    "backend": {
      "location": "global",
      "modelId": "gemini-flash-lite-latest",
      "protocol": "http"
    }
  },
  {
    "id": "gemini-3-pro-preview",
    "name": "Gemini 3 Pro",
    "description": "Best for reasoning and coding.",
    "backend": {
      "location": "global",
      "modelId": "gemini-3-pro-preview",
      "protocol": "http"
    }
  },
  {
    "id": "gemini-2.5-flash-image",
    "name": "Gemini 2.5 Flash Image",
    "description": "General image generation and editing.",
    "backend": {
      "location": "global",
      "modelId": "gemini-2.5-flash-image",
      "protocol": "http"
    }
  },
  {
    "id": "gemini-3-pro-image-preview",
    "name": "Gemini 3 Pro (Image)",
    "description": "High-quality image generation and editing.",
    "backend": {
      "location": "global",
      "modelId": "gemini-3-pro-image-preview",
      "protocol": "http"
    }
  },
  {
    "id": "veo-3.1-fast-generate-001",
    "name": "Veo 3.1 Fast",
    "description": "Rapid video generation.",
    "backend": {
      "location": "us-central1",
      "modelId": "veo-3.1-fast-generate-001",
      "protocol": "http"
    }
  },
  {
    "id": "imagen-4.0-generate-001",
    "name": "Imagen 4",
    "description": "Photorealistic image generation.",
    "backend": {
      "location": "us-central1",
      "modelId": "imagen-4.0-generate-001",
      "protocol": "http"
    }
  },
  {
    "id": "imagen-4.0-fast-generate-001",
    "name": "Imagen 4 Fast",
    "description": "Fast photorealistic image generation.",
    "backend": {
      "location": "us-central1",
      "modelId": "imagen-4.0-fast-generate-001",
      "protocol": "http"
    }
  }
];

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
