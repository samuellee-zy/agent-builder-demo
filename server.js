import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT_ID;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Vertex AI Clients
// We need separate clients for Global and Regional endpoints
const vertexClients = {};

function getVertexClient(location) {
  if (!vertexClients[location]) {
    if (!PROJECT_ID) {
      throw new Error('PROJECT_ID environment variable is required');
    }
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
// Model Configuration
const MODEL_CONFIG = {
  // Global Models
  'gemini-1.5-flash-002': { location: 'global' },
  'gemini-1.5-pro-002': { location: 'global' },
  // Mapped Models (Internal -> Actual)
  'gemini-2.5-flash': { location: 'global', modelId: 'gemini-2.5-flash' }, // Direct mapping per user request
  'gemini-3-pro-preview': { location: 'global', modelId: 'gemini-3-pro-preview' }, // Use actual ID
  'gemini-3-pro': { location: 'global', modelId: 'gemini-3-pro-preview' }, // Map alias to preview

  // Regional Models (Veo / Imagen)
  // 'gemini-2.0-flash-exp': { location: 'global' }, // Removed as requested

  // Regional Models (Veo / Imagen)
  'imagen-3.0-generate-001': { location: 'us-central1' },
  'imagen-4.0-fast-generate-001': { location: 'us-central1' }, // Added
  'veo-2.0-generate-001': { location: 'us-central1' },
  'veo-3.1-fast-generate-001': { location: 'us-central1' }, // Added
  'imagegeneration@006': { location: 'us-central1' },
};

// Helper to resolve model ID and location
function resolveModel(modelId) {
  const config = MODEL_CONFIG[modelId];
  if (config) {
    return {
      modelId: config.modelId || modelId,
      location: config.location
    };
  }

  // Heuristic: Imagen and Veo models usually require us-central1
  if (modelId.startsWith('imagen') || modelId.startsWith('veo')) {
    return { modelId, location: 'us-central1' };
  }

  // Default to global if unknown, or maybe us-central1? 
  // Let's default to global for "gemini" models and us-central1 for others if possible.
  // For safety, default to global for now as it covers most Gemini cases.
  return { modelId, location: 'global' };
}

// Helper to get Access Token
import { GoogleAuth } from 'google-auth-library';
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

async function getAccessToken() {
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

// Helper for REST API calls
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

// Imagen Generation
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
  // Imagen response: { predictions: [ { bytesBase64Encoded: "..." } ] }
  // Or { predictions: [ "base64..." ] } depending on version.
  // Usually: predictions[0].bytesBase64Encoded

  const imageBytes = data.predictions?.[0]?.bytesBase64Encoded || data.predictions?.[0];
  if (!imageBytes) throw new Error("No image data returned from Imagen.");

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

// Helper for logging with timestamps
const log = (msg, ...args) => console.log(`[${new Date().toISOString()}] ${msg}`, ...args);
const logError = (msg, ...args) => console.error(`[${new Date().toISOString()}] ${msg}`, ...args);

// Veo Generation (Video)
async function generateVideo(model, prompt, location, image = null) {
  // Veo 3.1 Fast Generate uses predictLongRunning (LRO)
  const instance = { prompt: prompt };

  // Add image if provided (for image-to-video)
  if (image) {
    instance.image = {
      bytesBase64Encoded: image.split(',')[1] || image, // Handle data URI or raw base64
      mimeType: "image/jpeg" // Default to jpeg, or extract from data URI if possible
    };

    // Try to extract mime type from data URI
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
      // videoLengthSeconds: 5, // Veo Fast might have fixed length
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
  // LRO Response: { name: "projects/.../locations/.../operations/..." }
  const operationName = startData.name;
  log(`[Veo] Operation started: ${operationName}`);

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 30; // Increased attempts since we start fast
  let delay = 5000; // Start with 5s delay
  const maxDelay = 60000; // Cap at 60s

  while (attempts < maxAttempts) {
    attempts++;
    log(`[Veo] Polling attempt ${attempts}. Waiting ${delay / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Exponential Backoff: 1.5x multiplier, capped at 60s
    delay = Math.min(delay * 1.5, maxDelay);

    // Use fetchPredictOperation to poll
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

        // Log the full response for debugging
        log(`[Veo] Operation done. Result keys: ${Object.keys(pollData.response || {}).join(', ')}`);

        // Recursive helper to find video data
        function findVideoInObject(obj) {
          if (!obj || typeof obj !== 'object') return null;

          // Check for direct video fields
          if (obj.video && typeof obj.video === 'string') {
            return { data: obj.video, mimeType: obj.mimeType || 'video/mp4' };
          }
          if (obj.bytesBase64Encoded && typeof obj.bytesBase64Encoded === 'string') {
            return { data: obj.bytesBase64Encoded, mimeType: obj.mimeType || 'video/mp4' };
          }

          // Search arrays and nested objects
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

        // Return as data URI
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
      // If not done, continue polling
    } catch (pollError) {
      logError(`[Veo] Polling network error: ${pollError.message}. Retrying...`);
    }
  }

  throw new Error("Veo generation timed out.");
}

// API Endpoint
app.post('/api/generate', async (req, res) => {
  const { model, prompt, location = 'us-central1', image } = req.body;

  log(`[API Request] ${model} (Length: ${prompt?.length || 0}) ${image ? `[Has Image: ${image.substring(0, 30)}...]` : '[No Image]'}`);

  try {
    // Resolve model ID and location
    const config = resolveModel(model);
    const modelId = config.modelId;
    const modelLocation = config.location; // Use resolved location

    // Dispatch based on model type
    if (model.startsWith('imagen')) {
      const result = await generateImage(modelId, prompt, modelLocation);
      return res.json(result);
    }

    if (model.startsWith('veo')) {
      const { image } = req.body; // Extract image from request
      const result = await generateVideo(modelId, prompt, modelLocation, image);
      return res.json(result);
    }

    // Default: Gemini (Text/Multimodal)
    const vertex_ai = getVertexClient(modelLocation);
    const generativeModel = vertex_ai.getGenerativeModel({ model: modelId });

    // Construct request object for Gemini
    const request = {
      contents: req.body.contents || [{ role: 'user', parts: [{ text: prompt }] }]
    };

    if (req.body.systemInstruction) {
      request.systemInstruction = req.body.systemInstruction;
    }

    if (req.body.tools) {
      request.tools = req.body.tools;
    }

    const result = await generativeModel.generateContent(request);
    res.json(result.response);
  } catch (error) {
    logError(`[API Error] ${error.message} `);
    const details = error.response ? JSON.stringify(error.response.data) : error.message;
    res.status(500).json({ error: error.message, details: details });
  }
});

// NSW Trains Realtime Proxy
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let GtfsRealtimeBindings;
try {
  GtfsRealtimeBindings = require('gtfs-realtime-bindings');
} catch (e) {
  console.warn('gtfs-realtime-bindings not found. NSW Trains features will be disabled.');
}

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

    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

    // Convert to JSON-friendly object (ProtoBuf objects can be complex)
    // We might want to filter or simplify, but for now let's return the whole feed.
    // It might be huge. Let's try to return it directly.
    // FeedMessage has 'entity' array.

    // To avoid circular references or BigInt issues, we can just return feed.
    // But protobufjs objects sometimes have toObject().
    const feedObject = GtfsRealtimeBindings.transit_realtime.FeedMessage.toObject(feed, {
      enums: String,  // enums as strings
      longs: String,  // longs as strings
      bytes: String,  // bytes as base64
      defaults: true, // include default values
      arrays: true,   // empty arrays as []
      objects: true,  // empty objects as {}
      oneofs: true    // include virtual oneof fields
    });

    res.json(feedObject);
  } catch (error) {
    logError(`[Transport/${dataset}] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/transport/planner/:endpoint', async (req, res) => {
  const { endpoint } = req.params;
  const TFNSW_API_KEY = process.env.TFNSW_API_KEY;

  if (!TFNSW_API_KEY) {
    return res.status(500).json({ error: 'TFNSW_API_KEY not configured on server.' });
  }

  // Construct query string from request query params
  const queryParams = new URLSearchParams(req.query);
  // Enforce JSON output format as per Swagger requirements
  queryParams.set('outputFormat', 'rapidJSON');
  queryParams.set('coordOutputFormat', 'EPSG:4326');
  queryParams.set('version', '10.2.1.42'); // Use version from swagger default or recent

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


// Catch-all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} `);
  console.log(`Project ID: ${PROJECT_ID} `);
});
