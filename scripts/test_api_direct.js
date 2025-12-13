
import fetch from 'node-fetch';

async function testGenerate() {
  console.log('Testing /api/generate endpoint...');
  try {
    const response = await fetch('http://localhost:8080/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-1.5-flash',
        prompt: 'Hello, are you working?',
        stream: false
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      console.error('Response Body:', text);
      return;
    }

    const data = await response.json();
    console.log('Success! Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}

testGenerate();
