
import { GoogleAuth } from 'google-auth-library';
import { VertexAI } from '@google-cloud/vertexai';

async function checkAuth() {
  console.log('--- Checking Google Auth ---');
  try {
    const auth = new GoogleAuth();
    const projectId = await auth.getProjectId();
    console.log(`Detected Project ID: ${projectId}`);
    
    const client = await auth.getClient();
    console.log(`Auth Client Type: ${client.constructor.name}`);
    console.log('Credentials acquired successfully.');

    console.log('\n--- Testing Vertex AI (Global) ---');
    const vertexAI = new VertexAI({ project: projectId, location: 'us-central1' }); // Vertex AI client requires a location, but we use 'global' endpoint implicitly for some models?
    // Actually, for Gemini 2.5 Flash global, we should initialize with location='global' if supported, or us-central1 and use global publisher model?
    // The server/index.js uses specific endpoint for global.
    
    const genericVertex = new VertexAI({ project: projectId, location: 'us-central1' });
    const generativeModel = genericVertex.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    console.log('Sending request to Gemini 1.5 Flash (us-central1)...');
    const resp = await generativeModel.generateContent('Hello');
    console.log('Response received:', resp.response.candidates[0].content.parts[0].text);

  } catch (error) {
    console.error('Auth/Vertex Check Failed:', error);
  }
}

checkAuth();
