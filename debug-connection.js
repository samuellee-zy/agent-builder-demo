import { GoogleAuth } from 'google-auth-library';

async function main() {
  const projectId = process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    console.error('Error: PROJECT_ID or GOOGLE_CLOUD_PROJECT env var is required');
    process.exit(1);
  }
  
  const location = 'global';
  const modelId = 'gemini-2.0-flash-exp';
  
  console.log(`Testing connection to ${projectId} / ${location} / ${modelId}`);

  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    console.log('Got access token:', token.token ? 'Yes (valid)' : 'No');

    const url = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:generateContent`;

    console.log(`Fetching ${url}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
      })
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Body Preview (first 500 chars):');
    console.log(text.substring(0, 500));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
