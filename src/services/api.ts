export interface GenerateContentOptions {
  model: string;
  prompt?: string;
  contents?: any[];
  systemInstruction?: string;
  stream?: boolean;
  history?: any[];
  responseMimeType?: string;
  tools?: any[];
  image?: string | null;
}

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
