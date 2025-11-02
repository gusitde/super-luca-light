export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  text: string;
}

interface LMStudioChoice {
  message?: {
    role?: string;
    content?: string;
  };
}

interface LMStudioResponseBody {
  choices?: LMStudioChoice[];
}

function normalizeBaseUrl(baseURL: string): string {
  return baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
}

export async function chatCompletion(
  messages: ChatCompletionMessage[],
  model: string,
  baseURL: string
): Promise<ChatCompletionResponse> {
  if (!model) {
    throw new Error("Missing model for chat completion request.");
  }

  if (!baseURL) {
    throw new Error("Missing LM Studio base URL for chat completion request.");
  }

  const endpoint = `${normalizeBaseUrl(baseURL)}/v1/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LM Studio request failed with status ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as LMStudioResponseBody;
  const firstChoice = data.choices?.[0];
  const content = firstChoice?.message?.content;

  if (!content) {
    throw new Error("LM Studio response did not include a message content.");
  }

  return { text: content };
}
