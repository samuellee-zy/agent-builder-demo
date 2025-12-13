
import { WebSocket } from 'ws';
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = process.env.PROJECT_ID || 'sam-gcp-demo';
const LOCATION = 'us-central1';
const MODEL_ID = 'gemini-live-2.5-flash-native-audio';

async function testConnection() {
  console.log('[Test] Starting Vertex AI Connection Test...');
  console.log(`[Test] Project: ${PROJECT_ID}`);
  console.log(`[Test] Model: ${MODEL_ID}`);

  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const accessToken = token.token;

    console.log('[Test] Auth Successful. Token obtained.');

    const resourcePath = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}`;
    const serviceUrl = `wss://${LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

    console.log(`[Test] Connecting to: ${serviceUrl}`);

    const options = {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const ws = new WebSocket(serviceUrl, options);

    ws.on('open', () => {
      console.log('[Test] ✅ WebSocket OPEN!');

      const setupMsg = {
        setup: {
          model: resourcePath,
          generation_config: { response_modalities: ["AUDIO"] }
        }
      };
      ws.send(JSON.stringify(setupMsg));
      console.log('[Test] Setup sent. Waiting for response...');
    });

    ws.on('message', (data) => {
      console.log('[Test] 📩 Received Message:', data.toString());
      ws.close();
      process.exit(0);
    });

    ws.on('error', (err) => {
      console.error('[Test] ❌ WebSocket Error:', err.message);
      console.error(err);
    });

    ws.on('close', (code, reason) => {
      console.log(`[Test] WebSocket Closed. Code: ${code}, Reason: ${reason}`);
    });

  } catch (e) {
    console.error('[Test] Fatal Error:', e);
  }
}

testConnection();
