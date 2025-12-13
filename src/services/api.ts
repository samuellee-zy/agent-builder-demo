/**
 * @file src/services/api.ts
 * @description Generic API Client Wrapper for the Backend Proxy.
 * 
 * Handles:
 * 1. Constructing the request body for Vertex AI (Gemini) format.
 * 2. Sending requests to `/api/generate`.
 * 3. Error handling and logging.
 */

export interface GenerateContentOptions {
  model: string;
  prompt?: string;
  /** Chat history or multimodal content parts. */
  contents?: any[];
  systemInstruction?: string;
  stream?: boolean;
  /** History array to be prepended to the current prompt. */
  history?: any[];
  responseMimeType?: string;
  /** List of tool definitions. */
  tools?: any[];
  /** Base64 image data (optional). */
  image?: string | null;
}

/**
 * Sends a generation request to the backend API.
 * 
 * @param options - Configuration including model, prompt, and context.
 * @returns The parsed JSON response from the backend.
 * @throws Error if the API call fails or returns non-JSON error.
 */
export async function generateContent(options: GenerateContentOptions) {
  let body: any = { ...options };

  // Construct contents from history + prompt if provided
  if (options.history) {
    body.contents = [...options.history];
    if (options.prompt) {
      body.contents.push({ role: 'user', parts: [{ text: options.prompt }] });
    }
  } else if (options.prompt && !body.contents) {
    body.contents = [{ role: 'user', parts: [{ text: options.prompt }] }];
  }

  if (options.responseMimeType) {
    body.generationConfig = { responseMimeType: options.responseMimeType };
  }

  if (options.tools) {
    body.tools = options.tools;
  }

  console.log(`[API Request] ${options.model}`, body);

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch (e) {
      // If response is not JSON (e.g. HTML 500 error), use text as error message
      console.error('[API Error] Non-JSON response:', text);
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${text.substring(0, 100)}...`);
    }
    console.error('[API Error] JSON response:', errorData);
    throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`[API Response] ${options.model}`, data);
  return data;
}

