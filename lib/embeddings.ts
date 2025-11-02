import { getSettings } from "@/lib/db";

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_EMBED_MODEL = "nomic-embed-text";

interface OllamaEmbeddingResponse {
  embedding?: number[];
  embeddings?: number[][];
  data?: Array<{ embedding: number[] }>;
}

function resolveBaseUrl(rawUrl: string | null | undefined): string {
  const url = rawUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL;
  return url.replace(/\/$/, "");
}

function resolveModel(model: string | null | undefined): string {
  return model ?? process.env.OLLAMA_EMBED_MODEL ?? DEFAULT_EMBED_MODEL;
}

function normalizeEmbeddings(response: OllamaEmbeddingResponse): number[][] {
  if (Array.isArray(response.embeddings)) {
    return response.embeddings;
  }

  if (Array.isArray(response.data)) {
    return response.data.map((entry) => entry.embedding);
  }

  if (Array.isArray(response.embedding)) {
    return [response.embedding];
  }

  throw new Error("Unexpected embedding response format from Ollama");
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) {
    return [];
  }

  const settings = getSettings();
  const baseUrl = resolveBaseUrl(settings.ollamaBaseUrl);
  const model = resolveModel(settings.modelEmbed);

  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate embeddings: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as OllamaEmbeddingResponse;
  const embeddings = normalizeEmbeddings(payload);

  if (embeddings.length !== texts.length) {
    throw new Error(`Embedding count mismatch. Expected ${texts.length}, received ${embeddings.length}.`);
  }

  return embeddings.map((vector) => Float32Array.from(vector));
}
