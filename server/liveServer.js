import { WebSocketServer, WebSocket } from 'ws';
import { GoogleAuth } from 'google-auth-library';
import { Buffer } from 'node:buffer';

// Configuration
const PROJECT_ID = process.env.PROJECT_ID || 'sam-gcp-demo';
const LOCATION = 'us-central1';
const MODEL_ID = 'gemini-live-2.5-flash-native-audio'; // Verified Native Audio Model
const API_ENDPOINT = `wss://${LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

/**
 * setupLiveServer
 * Attaches a WebSocket server to the existing HTTP server.
 * Handles bidirectional streaming between Client <-> Backend <-> Vertex AI.
 * @param {import('http').Server} server
 */
export function setupLiveServer(server) {
  const wss = new WebSocketServer({ server, path: '/api/live' });

  wss.on('connection', async (ws) => {
    console.log('[LiveServer] Client connected (v3: Bidi Fixed)');

    let vertexWs = null;
    let pendingConfig = null;
    let accessToken = null;

    // 1. Register Message Listener IMMEDIATELY
    ws.on('message', async (data) => {
      const isBuffer = Buffer.isBuffer(data);

      // If not configured yet (Handshake Phase)
      if (!vertexWs) {
        // ... (Handshake Logic) ...
        // Try to parse as Config (JSON) regardless of Buffer type (since ws returns Buffers for text too)
        try {
          const str = data.toString();
          const msg = JSON.parse(str);

          if (msg.type === 'config') {
            // ...
          }
        } catch (e) {
          // Not JSON, likely Audio Buffer arrival before Setup Complete.
        }
        return;
      }

      // If connected to Vertex, forward the data
      if (vertexWs.readyState === WebSocket.OPEN) {
        if (isBuffer) {
          // PROXY LOGIC: Pass-through Audio
          // We receive Raw PCM Int16 audio from the client.
          // We must wrap it in the Vertex AI JSON Protocol structure for `realtime_input`.
          // Vertex requires the data as a Base64 string.
          const base64Audio = data.toString('base64');
          const msg = {
            realtime_input: {
              media_chunks: [{
                mime_type: "audio/pcm;rate=16000",
                data: base64Audio
              }]
            }
          };
          vertexWs.send(JSON.stringify(msg));
        } else {
          // PROXY LOGIC: Pass-through Control Message
          // JSON messages (like tool_response) are forwarded directly.
          try {
            const parsed = JSON.parse(data.toString());
            // Filter to only allow valid protocol messages (Simple security/validation)
            if (parsed.realtime_input || parsed.client_content) {
              vertexWs.send(JSON.stringify(parsed));
            }
          } catch (e) {
            console.error('[LiveServer] Message Error:', e);
          }
        }
      }
    });

    try {
      // 2. Authenticate (Async)
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      const client = await auth.getClient();
      const token = await client.getAccessToken();
      accessToken = token.token;
      console.log('[LiveServer] Auth Successful.');

      // 3. Check for Pending Config
      if (pendingConfig) {
        console.log('[LiveServer] Found Pending Config. Connecting to Vertex...');
        startVertexConnection(pendingConfig, accessToken, ws);
        pendingConfig = null;
      }

    } catch (err) {
      console.error('[LiveServer] Auth Error:', err);
      ws.close();
    }

    // --- Vertex Connection Logic ---
    function startVertexConnection(config, accessToken, clientWs) {
      // Use the verified Multimodal Live API model
      // User Confirmed: 'gemini-live-2.5-flash-native-audio' is the correct internal model ID.
      const actualModelId = 'gemini-live-2.5-flash-native-audio';
      const resourcePath = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${actualModelId}`;
      const serviceUrl = `wss://${LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

      console.log(`[LiveServer] Connecting to Vertex AI...`);
      console.log(`[LiveServer] Target: ${serviceUrl}`);
      console.log(`[LiveServer] Resource: ${resourcePath}`);

      const options = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      try {
        vertexWs = new WebSocket(serviceUrl, options);
      } catch (wsErr) {
        console.error('[LiveServer] Failed to construct WebSocket:', wsErr);
        clientWs.close();
        return;
      }

      vertexWs.on('open', () => {
        console.log('[LiveServer] Vertex Connected. Sending Setup...');

        // Construct Setup Message
        const setupMsg = {
          setup: {
            model: resourcePath,
            generation_config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: config.voice || "Puck"
                  }
                }
              }
            },
            system_instruction: {
              parts: [{ text: config.systemInstruction || "You are a helpful assistant." }]
            }
          }
        };

        // Add Tools if present
        if (config.tools && config.tools.length > 0) {
          setupMsg.setup.tools = config.tools;
        }

        vertexWs.send(JSON.stringify(setupMsg));
        console.log('[LiveServer] Setup Payload Sent:', JSON.stringify(setupMsg, null, 2));

        // Notify Client that Setup is Complete
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ type: 'setup_complete' }));
        }
      });

      vertexWs.on('message', (data) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          const isBuffer = Buffer.isBuffer(data);
          let utf8String = null;

          // Attempt to detect if this "Buffer" is actually just JSON text
          if (isBuffer) {
            try {
              const str = data.toString('utf8');
              // Simple heuristic: Does it start with '{'? 
              if (str.trim().startsWith('{')) {
                // It's likely JSON. Let's try to parse it to be sure.
                JSON.parse(str);
                utf8String = str;
              }
            } catch (e) {
              // Not JSON.
            }
          }

          if (utf8String) {
            // It is Text (JSON). Send as Text Frame.
            // console.log(`[LiveServer] Forwarding Text Message`);
            clientWs.send(utf8String);
          } else {
            // It is Binary (Audio). Send as Binary Frame.
            if (Math.random() < 0.05) {
              console.log(`[LiveServer] Forwarding Audio Chunk (${data.length} bytes) to Client`);
            }
            clientWs.send(data);
          }
        }
      });

      vertexWs.on('error', (err) => {
        console.error('[LiveServer] Vertex WebSocket Error:', err);
        console.error('[LiveServer] Error Details:', err.message);
        clientWs.send(JSON.stringify({
          type: 'error',
          error: `Vertex API Error: ${err.message}`
        }));
        clientWs.close();
      });

      vertexWs.on('close', (code, reason) => {
        console.log(`[LiveServer] Vertex Closed. Code: ${code}, Reason: ${reason}`);
        clientWs.close();
      });
    }
  });

  return wss;
}
