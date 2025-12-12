import { VertexAI } from '@google-cloud/vertexai';

async function main() {
  const projectId = process.env.PROJECT_ID || 'sam-gcp-demo';
  const location = 'global';
  const modelId = 'gemini-2.0-flash-exp';

  console.log(`Testing SDK connection to ${projectId} / ${location} / ${modelId}`);

  try {
    const vertex_ai = new VertexAI({
      project: projectId,
      location: location,
      apiEndpoint: 'aiplatform.googleapis.com'
    });
    const generativeModel = vertex_ai.getGenerativeModel({ model: modelId });

    const request = {
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
    };

    console.log('Sending request...');
    const result = await generativeModel.generateContent(request);
    console.log('Response received:');
    console.log(JSON.stringify(result.response, null, 2));

  } catch (error) {
    console.error('SDK Error:', error);
  }
}

main();
