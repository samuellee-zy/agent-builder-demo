
import fetch from 'node-fetch';

async function testModel(modelName) {
  console.log(`Testing model: ${modelName}...`);
  try {
    const response = await fetch('http://localhost:8080/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: 'Hello, what model are you?',
        stream: false
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[${modelName}] HTTP Error: ${response.status} ${response.statusText}`);
      console.error(`[${modelName}] Response Body:`, text);
      return;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "No content returned";
    console.log(`[${modelName}] Success! Response: ${content.substring(0, 100)}...`);
  } catch (error) {
    console.error(`[${modelName}] Fetch failed:`, error);
  }
}

async function runTests() {
  await testModel('gemini-2.5-flash');
  await testModel('gemini-3-pro-preview');
}

runTests();
