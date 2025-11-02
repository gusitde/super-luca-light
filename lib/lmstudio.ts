export type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface ChatCompletionResult {
  text: string;
}

function normalizeBaseUrl(baseURL: string): string {
  return baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
}

export async function chatCompletion(
  messages: ChatCompletionMessage[],
  model: string,
  baseURL: string,
  options?: { temperature?: number }
): Promise<ChatCompletionResult> {
  if (!model?.trim()) {
    throw new Error("LM Studio model is not configured.");
  }

  if (!baseURL?.trim()) {
    throw new Error("LM Studio base URL is not configured.");
  }

  const payload: Record<string, unknown> = {
    model,
    messages,
  };

  if (options?.temperature !== undefined) {
    payload.temperature = options.temperature;
  }

  const response = await fetch(`${normalizeBaseUrl(baseURL)}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LM Studio request failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("LM Studio response did not include a message.");
  }

  return { text };
}
