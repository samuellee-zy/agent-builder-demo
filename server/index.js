/**
 * @file server/index.js
 * @description Backend API Proxy and Vertex AI Integration Layer.
 * 
 * Responsibilities:
 * 1. Proxy requests to Google Vertex AI (Gemini, Veo, Imagen).
 * 2. Handle Authentication using Application Default Credentials (ADC) for Cloud Run.
 * 3. Serve static assets in production.
 * 4. Manage Long-Running Operations (LRO) for video generation.
 * 5. Proxy Transport NSW Realtime API requests (GTFS & Trip Planner).
 * 
 * @module Server
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

// Load environment variables from .env file (local development only)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080; // Cloud Run expects 8080
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT_ID;

if (!PROJECT_ID) {
  console.warn("WARNING: PROJECT_ID is not set. Vertex AI calls will fail.");
}

// Middleware to parse large JSON payloads (required for Base64 image uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../dist')));

/**
 * Cache for Vertex AI Clients.
 * We need separate clients for Global endpoints (Gemini) and Regional endpoints (Veo/Imagen).
 * @type {Object.<string, VertexAI>}
 */
const vertexClients = {};

/**
 * Instantiates or retrieves a cached Vertex AI client for a specific location.
 * 
 * @param {string} location - The Google Cloud region (e.g., 'us-central1', 'global').
 * @returns {VertexAI} The initialized Vertex AI client.
 */
function getVertexClient(location) {
  if (!vertexClients[location]) {
    if (!PROJECT_ID) {
      throw new Error('PROJECT_ID environment variable is required used for Vertex AI.');
    }
    // Global endpoints use 'aiplatform.googleapis.com', regional use 'region-aiplatform...'
    const apiEndpoint = location === 'global'
      ? 'aiplatform.googleapis.com'
      : `${location}-aiplatform.googleapis.com`;

    vertexClients[location] = new VertexAI({
      project: PROJECT_ID,
      location: location,
      apiEndpoint: apiEndpoint
    });
  }
  return vertexClients[location];
}

// Model Configuration
/**
 * Model Configuration Map.
 * Maps high-level Model IDs/Aliases to their specific Locations and Version IDs.
 * Use this to control which region handles a specific model request.
 */
const MODEL_CONFIG = {
  // Global Models (Gemini Text/Multimodal)
  'gemini-1.5-flash-002': { location: 'global' },
  'gemini-1.5-pro-002': { location: 'global' },

  // Custom Aliases
  'gemini-2.5-flash': { location: 'global', modelId: 'gemini-2.5-flash' },
  'gemini-3-pro-preview': { location: 'global', modelId: 'gemini-3-pro-preview' },
  'gemini-3.0-pro-preview': { location: 'global', modelId: 'gemini-3-pro-preview' },
  'gemini-3-pro': { location: 'global', modelId: 'gemini-3-pro-preview' }, 

  // Regional Models (Media Generation requires specific regions like us-central1)
  'imagen-3.0-generate-001': { location: 'us-central1' },
  'imagen-4.0-fast-generate-001': { location: 'us-central1' }, 
  'veo-2.0-generate-001': { location: 'us-central1' },
  'veo-3.1-fast-generate-001': { location: 'us-central1' },
  'imagegeneration@006': { location: 'us-central1' },
};

/**
 * Resolves the correct Model ID and Location for a given alias.
 * Defaults to 'global' if not specified, unless it detects 'imagen'/'veo' prefixes.
 * 
 * @param {string} modelId - The requested model ID or alias.
 * @returns {{modelId: string, location: string}} Resolved configuration.
 */
function resolveModel(modelId) {
  const config = MODEL_CONFIG[modelId];
  if (config) {
    return {
      modelId: config.modelId || modelId,
      location: config.location
    };
  }

  // Heuristic: specific media models often require us-central1
  if (modelId.startsWith('imagen') || modelId.startsWith('veo')) {
    return { modelId, location: 'us-central1' };
  }

  // Default fallback
  return { modelId, location: 'global' };
}

// Authentication Helper
import { GoogleAuth } from 'google-auth-library';
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

/**
 * Retrieves the OAuth 2.0 Access Token from Application Default Credentials.
 * Required for calling REST APIs directly (Veo, Imagen) instead of using the Node.js SDK.
 * @returns {Promise<string>} Access Token
 */
async function getAccessToken() {
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

/**
 * Executes a REST API call to Vertex AI.
 * Used for models not yet fully supported by the Node.js SDK (like some Veo/Imagen versions).
 * 
 * @param {string} location - Region (e.g. 'us-central1').
 * @param {string} modelId - Model ID.
 * @param {Object} payload - JSON body.
 * @returns {Promise<Object>} JSON response.
 */
async function callVertexRestApi(location, modelId, payload) {
  const token = await getAccessToken();
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${location}/publishers/google/models/${modelId}:predict`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vertex API Error (${response.status}): ${text}`);
  }

  return await response.json();
}

/**
 * Handles Imagen image generation requests.
 * @param {string} model - Model ID.
 * @param {string} prompt - User prompt.
 * @param {string} location - Region.
 * @returns {Promise<Object>} Standardized generation response.
 */
async function generateImage(model, prompt, location) {
  const payload = {
    instances: [{ prompt: prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1",
      outputMimeType: "image/jpeg"
    }
  };

  const data = await callVertexRestApi(location, model, payload);
  // Imagen response structure handling (base64 bytes)
  const imageBytes = data.predictions?.[0]?.bytesBase64Encoded || data.predictions?.[0];
  if (!imageBytes) throw new Error("No image data returned from Imagen.");

  // Wrap in a structure mimicking the Gemini SDK response for frontend consistency
  return {
    candidates: [{
      content: {
        parts: [{
          text: `Here is your generated image:\n\n![Generated Image](data:image/jpeg;base64,${imageBytes})`
        }]
      }
    }]
  };
}

// Helper for consistent logging with timestamps
const log = (msg, ...args) => console.log(`[${new Date().toISOString()}] ${msg}`, ...args);
const logError = (msg, ...args) => console.error(`[${new Date().toISOString()}] ${msg}`, ...args);

/**
 * Handles Veo Video Generation.
 * **Note:** Veo 3.1 Fast Generate uses Long-Running Operations (LRO).
 * We must poll the `fetchPredictOperation` endpoint until completion.
 * 
 * @param {string} model - Model ID.
 * @param {string} prompt - Text prompt.
 * @param {string} location - Region.
 * @param {string|null} image - Base64 image data for Image-to-Video (optional).
 * @returns {Promise<Object>} Result with Data URI for video.
 */
async function generateVideo(model, prompt, location, image = null) {
  const instance = { prompt: prompt };

  // Add image if provided (for image-to-video mode)
  if (image) {
    instance.image = {
      bytesBase64Encoded: image.split(',')[1] || image, // Strip Data URI prefix if present
      mimeType: "image/jpeg" 
    };

    // Attempt to detect actual mime type from Data URI
    if (image.startsWith('data:')) {
      const matches = image.match(/^data:(.+);base64,/);
      if (matches && matches[1]) {
        instance.image.mimeType = matches[1];
      }
    }
  }

  const payload = {
    instances: [instance],
    parameters: {
      sampleCount: 1,
      aspectRatio: "16:9"
    }
  };

  const token = await getAccessToken();
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${location}/publishers/google/models/${model}:predictLongRunning`;

  log(`[Veo] Starting LRO at ${endpoint}`);

  const startResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!startResponse.ok) {
    const text = await startResponse.text();
    throw new Error(`Vertex API Error (${startResponse.status}): ${text}`);
  }

  const startData = await startResponse.json();
  const operationName = startData.name;
  log(`[Veo] Operation started: ${operationName}`);

  // Polling Configuration
  let attempts = 0;
  const maxAttempts = 30;
  let delay = 5000; // Start with 5s
  const maxDelay = 60000; // Cap backoff at 60s

  while (attempts < maxAttempts) {
    attempts++;
    log(`[Veo] Polling attempt ${attempts}. Waiting ${delay / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Exponential Backoff
    delay = Math.min(delay * 1.5, maxDelay);

    const pollEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${location}/publishers/google/models/${model}:fetchPredictOperation`;
    const pollPayload = { operationName: operationName };

    try {
      const pollResponse = await fetch(pollEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pollPayload)
      });

      if (!pollResponse.ok) {
        logError(`[Veo] Polling failed (${pollResponse.status}). Retrying...`);
        continue;
      }

      const pollData = await pollResponse.json();

      if (pollData.done) {
        if (pollData.error) {
          throw new Error(`Veo Generation Failed: ${pollData.error.message}`);
        }

        // Recursive helper to find video data in deeply nested response structure
        function findVideoInObject(obj) {
          if (!obj || typeof obj !== 'object') return null;
          if (obj.video && typeof obj.video === 'string') return { data: obj.video, mimeType: obj.mimeType || 'video/mp4' };
          if (obj.bytesBase64Encoded && typeof obj.bytesBase64Encoded === 'string') return { data: obj.bytesBase64Encoded, mimeType: obj.mimeType || 'video/mp4' };

          if (Array.isArray(obj)) {
            for (const item of obj) {
              const found = findVideoInObject(item);
              if (found) return found;
            }
          } else {
            for (const key in obj) {
              const found = findVideoInObject(obj[key]);
              if (found) return found;
            }
          }
          return null;
        }

        const videoResult = findVideoInObject(pollData.response);

        if (!videoResult) {
          logError("Veo Final Response (Full):", JSON.stringify(pollData, null, 2));
          throw new Error("No video data found in completed operation.");
        }

        const { data: videoData, mimeType } = videoResult;

        return {
          candidates: [{
            content: {
              parts: [{
                text: `Here is your generated video:\n\n[Download Video](data:${mimeType};base64,${videoData})`
              }]
            }
          }]
        };
      }
    } catch (pollError) {
      logError(`[Veo] Polling network error: ${pollError.message}. Retrying...`);
    }
  }

  throw new Error("Veo generation timed out.");
}

/**
 * Main Generation Endpoint.
 * Dispatches to Gemini, Veo, or Imagen based on model ID.
 * @route POST /api/generate
 */

/**
 * Executes a REST API call to Vertex AI Generative API (:generateContent).
 * Used for Gemini models to bypass potential Node.js SDK gRPC/timeouts issues.
 * 
 * @param {string} location - Region (e.g. 'us-central1' or 'global').
 * @param {string} modelId - Model ID.
 * @param {Object} payload - JSON body in snake_case.
 * @returns {Promise<Object>} JSON response.
 */
async function callVertexGenerativeApi(location, modelId, payload) {
  const token = await getAccessToken();
  const host = location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`;
  const endpoint = `https://${host}/v1/projects/${PROJECT_ID}/locations/${location}/publishers/google/models/${modelId}:generateContent`;

  log(`[Vertex REST] POST ${endpoint}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vertex API Error (${response.status}): ${text}`);
  }

  return await response.json();
}

/**
 * Main Generation Endpoint.
 * Dispatches to Gemini, Veo, or Imagen based on model ID.
 * Uses Direct REST API for all calls to ensure reliability.
 * @route POST /api/generate
 */
app.post('/api/generate', async (req, res) => {
  const { model, prompt, location = 'us-central1', image, contents, systemInstruction, tools, generationConfig } = req.body;

  log(`[API Request] ${model} (Length: ${prompt?.length || 0}) ${image ? `[Has Image]` : ''}`);

  try {
    const config = resolveModel(model);
    const modelId = config.modelId;
    const modelLocation = config.location;

    // Dispatcher
    if (model.startsWith('imagen')) {
      const result = await generateImage(modelId, prompt, modelLocation);
      return res.json(result);
    }

    // For Gemini (Text/Multimodal)
    // Construct REST Payload (Snake Case)
    const payload = {
      contents: contents || [],
    };

    // If 'prompt' is provided but no 'contents' (legacy/simple mode), wrap it
    if (prompt && (!contents || contents.length === 0)) {
      payload.contents.push({ role: 'user', parts: [{ text: prompt }] });
    }

    // Map System Instruction (String -> Object)
    if (systemInstruction) {
      payload.system_instruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    // Map Tools (camelCase -> snake_case)
    if (tools && tools.length > 0) {
      payload.tools = tools.map(tool => ({
        function_declarations: tool.functionDeclarations || tool.function_declarations
      }));
    }

    // Map Generation Config (camelCase -> snake_case)
    if (generationConfig) {
      payload.generation_config = {};
      if (generationConfig.responseMimeType) payload.generation_config.response_mime_type = generationConfig.responseMimeType;
      if (generationConfig.temperature) payload.generation_config.temperature = generationConfig.temperature;
      if (generationConfig.candidateCount) payload.generation_config.candidate_count = generationConfig.candidateCount;
    }

    console.log(`[Proxy] REST Generating with model: ${modelId} @ ${modelLocation}`);
    console.log(`[Proxy] Payload Preview:`, JSON.stringify(payload, null, 2).substring(0, 500) + "..."); // Log first 500 chars

    const result = await callVertexGenerativeApi(modelLocation, modelId, payload);

    // Return standard response
    res.json(result);

  } catch (error) {
    logError(`[API Dispatcher] Error: ${error.message}`);
    // Log the full error stack for debugging
    console.error(error);
    // Extract upstream error details if available
    res.status(500).json({ error: error.message });
  }
});

// NSW Trains Realtime Proxy
// Uses gtfs-realtime-bindings to decode Protobuf data
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let GtfsRealtimeBindings;
try {
  GtfsRealtimeBindings = require('gtfs-realtime-bindings');
} catch (e) {
  console.warn('gtfs-realtime-bindings not found. NSW Trains features will be disabled.');
}

/**
 * Proxy for Transport NSW GTFS Realtime feeds.
 * Decodes Protobuf response and returns JSON.
 * @route POST /api/transport/:dataset
 */
app.post('/api/transport/:dataset', async (req, res) => {
  const { dataset } = req.params;
  const VALID_DATASETS = ['sydneytrains', 'metro'];

  if (!VALID_DATASETS.includes(dataset)) {
    return res.status(400).json({ error: `Invalid dataset. Supported: ${VALID_DATASETS.join(', ')}` });
  }

  const TFNSW_API_KEY = process.env.TFNSW_API_KEY;
  if (!TFNSW_API_KEY) {
    return res.status(500).json({ error: 'TFNSW_API_KEY not configured on server.' });
  }

  try {
    const response = await fetch(`https://api.transport.nsw.gov.au/v2/gtfs/realtime/${dataset}`, {
      headers: {
        'Authorization': `apikey ${TFNSW_API_KEY}`,
        'Accept': 'application/x-google-protobuf'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Transport API Error (${response.status}): ${text}`);
    }

    const buffer = await response.arrayBuffer();

    if (!GtfsRealtimeBindings) {
      throw new Error('gtfs-realtime-bindings package is missing.');
    }

    // Decode Protobuf
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

    // Convert to JSON-friendly object
    const feedObject = GtfsRealtimeBindings.transit_realtime.FeedMessage.toObject(feed, {
      enums: String,
      longs: String,
      bytes: String,
      defaults: true,
      arrays: true,
      objects: true,
      oneofs: true
    });

    res.json(feedObject);
  } catch (error) {
    logError(`[Transport/${dataset}] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Proxy for Transport NSW Trip Planner API.
 * Ensures usage of 'rapidJSON' and 'EPSG:4326' formats.
 * @route GET /api/transport/planner/:endpoint
 */
app.get('/api/transport/planner/:endpoint', async (req, res) => {
  const { endpoint } = req.params;
  const TFNSW_API_KEY = process.env.TFNSW_API_KEY;

  if (!TFNSW_API_KEY) {
    return res.status(500).json({ error: 'TFNSW_API_KEY not configured on server.' });
  }

  const queryParams = new URLSearchParams(req.query);
  queryParams.set('outputFormat', 'rapidJSON');
  queryParams.set('coordOutputFormat', 'EPSG:4326');
  queryParams.set('version', '10.2.1.42');

  const url = `https://api.transport.nsw.gov.au/v1/tp/${endpoint}?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `apikey ${TFNSW_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Trip Planner API Error (${response.status}): ${text}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    logError(`[TripPlanner/${endpoint}] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});


// Catch-all handler for SPA (serves index.html for unknown routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} `);
  console.log(`Project ID: ${PROJECT_ID} `);
});
