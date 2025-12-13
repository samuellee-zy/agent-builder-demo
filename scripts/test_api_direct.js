
// Native fetch is available in Node.js 18+
// const fetch = require('node-fetch');

async function testModel(modelId, prompt) {
  console.log(`\nTesting ${modelId}...`);
  try {
    const response = await fetch('http://localhost:8080/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        prompt: prompt
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    console.log(`[SUCCESS] ${modelId}`);
    // console.log(JSON.stringify(data, null, 2));
    if (data.candidates && data.candidates[0].content) {
      console.log("Response:", data.candidates[0].content.parts[0].text.substring(0, 100) + "...");
    } else {
      console.log("No content in response:", JSON.stringify(data));
    }
  } catch (error) {
    console.error(`[FAILED] ${modelId}:`, error.message);
  }
}

async function runTests() {
  // Test 1: Gemini 2.5 Flash (Global)
  await testModel('gemini-2.5-flash', 'What is the capital of Australia?');

  // Test 2: Gemini 3.0 Pro Preview (Global)
  await testModel('gemini-3-pro-preview', 'Calculate the fibonacci of 5. Think step by step.');
}

runTests();
