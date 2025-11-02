import { NextResponse } from "next/server";

import {
  addMessage,
  getConversation,
  getPersona,
  getSettings,
  listMessages,
  newConversation,
  type Message,
} from "@/lib/db";
import { chatCompletion, type ChatCompletionMessage } from "@/lib/lmstudio";

const HISTORY_LIMIT = 20;

interface SendChatRequestBody {
  conversationId?: number;
  text?: string;
}

interface SearchResult {
  chunkId: number;
  documentId: number;
  chunkIndex: number;
  content: string;
  score: number;
}

interface SearchResponseBody {
  query: string;
  k: number;
  results: SearchResult[];
}

function buildSystemPrompt(jobDescription: string, memoryPrompt: string): string {
  const parts = [jobDescription?.trim(), memoryPrompt?.trim()].filter((part) => Boolean(part)) as string[];
  if (parts.length === 0) {
    return "You are a helpful assistant.";
  }

  return parts.join("\n\n");
}

function createContextMessage(results: SearchResult[]): ChatCompletionMessage | null {
  if (results.length === 0) {
    return null;
  }

  const snippets = results
    .map((result, index) => `Snippet ${index + 1}:\n${result.content}`)
    .join("\n\n");

  return {
    role: "assistant",
    content: `The following contextual information was retrieved:\n\n${snippets}`,
  } satisfies ChatCompletionMessage;
}

function mapHistoryMessages(messages: Message[]): ChatCompletionMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  } satisfies ChatCompletionMessage));
}

async function performSearch(query: string, request: Request, k: number): Promise<SearchResult[]> {
  if (!query.trim() || k <= 0) {
    return [];
  }

  try {
    const url = new URL("/api/search", request.url);
    url.searchParams.set("q", query);
    url.searchParams.set("k", String(k));

    const response = await fetch(url.toString(), {
      method: "GET",
    });

    if (!response.ok) {
      console.error("Search request failed", response.status, await response.text());
      return [];
    }

    const data = (await response.json()) as SearchResponseBody;
    return Array.isArray(data.results) ? data.results : [];
  } catch (error) {
    console.error("Search request encountered an error", error);
    return [];
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SendChatRequestBody | null;

  if (!body || typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "Missing 'text' in request body." }, { status: 400 });
  }

  const inputText = body.text.trim();
  const settings = getSettings();
  const persona = getPersona();

  if (!settings.modelText) {
    return NextResponse.json({ error: "Text model is not configured." }, { status: 500 });
  }

  if (!settings.lmstudioBaseUrl) {
    return NextResponse.json({ error: "LM Studio base URL is not configured." }, { status: 500 });
  }

  let conversationId = body.conversationId;
  if (typeof conversationId === "number") {
    const existing = getConversation(conversationId);
    if (!existing) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
  } else {
    const title = inputText.length > 60 ? `${inputText.slice(0, 57)}...` : inputText;
    const conversation = newConversation(title);
    conversationId = conversation.id;
  }

  const previousMessages = listMessages(conversationId);
  const userMessage = addMessage({
    conversationId,
    role: "user",
    content: inputText,
  });

  const historyLimit = Math.max(0, HISTORY_LIMIT - 1);
  const limitedHistory = historyLimit > 0 ? previousMessages.slice(-historyLimit) : [];

  const ragTopKValue =
    typeof settings.ragTopK === "number" && Number.isFinite(settings.ragTopK) && settings.ragTopK > 0
      ? Math.floor(settings.ragTopK)
      : 5;

  const ragResults = await performSearch(inputText, request, ragTopKValue);
  const ragContextMessage = createContextMessage(ragResults);
  const usedRag = Boolean(ragContextMessage);

  const messagesForModel: ChatCompletionMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt(persona.jobDescription, persona.memoryPrompt),
    },
    ...mapHistoryMessages(limitedHistory),
  ];

  if (ragContextMessage) {
    messagesForModel.push(ragContextMessage);
  }

  messagesForModel.push({
    role: userMessage.role,
    content: userMessage.content,
  });

  try {
    const completion = await chatCompletion(messagesForModel, settings.modelText, settings.lmstudioBaseUrl);

    const assistantMessage = addMessage({
      conversationId,
      role: "assistant",
      content: completion.text,
      usedRag,
    });

    return NextResponse.json({
      conversationId,
      text: assistantMessage.content,
    });
  } catch (error) {
    console.error("Failed to complete chat message", error);
    return NextResponse.json({ error: "Failed to generate assistant response." }, { status: 502 });
  }
}
