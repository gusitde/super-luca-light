import { NextResponse } from "next/server";

import {
  addMessage,
  getConversation,
  getPersona,
  getSettings,
  listMessages,
  newConversation,
  type Conversation,
  type Message,
  type Persona,
} from "@/lib/db";
import { chatCompletion, type ChatCompletionMessage } from "@/lib/lmstudio";

const HISTORY_LIMIT = 20;

interface SendChatPayload {
  conversationId?: number | string;
  text?: string;
}

function buildSystemPrompt(persona: Persona): string {
  const parts = [persona.jobDescription, persona.memoryPrompt]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part && part.length > 0));

  if (!parts.length) {
    return "You are a helpful AI assistant.";
  }

  return parts.join("\n\n");
}

function normalizeConversationTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "New Conversation";
  }

  if (trimmed.length <= 60) {
    return trimmed;
  }

  return `${trimmed.slice(0, 57)}...`;
}

function parseConversationId(value: SendChatPayload["conversationId"]): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

async function runRagSearch(query: string, requestUrl: string, k?: number) {
  const searchUrl = new URL("/api/search", requestUrl);
  searchUrl.searchParams.set("q", query);
  if (typeof k === "number" && Number.isFinite(k) && k > 0) {
    searchUrl.searchParams.set("k", String(Math.floor(k)));
  }

  try {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      console.warn("RAG search failed", response.status, response.statusText);
      return { used: false as const, content: "" };
    }

    const data = (await response.json()) as {
      results?: Array<{ content?: string }>;
    };

    const snippets = Array.isArray(data.results)
      ? data.results
          .map((result) => result?.content?.trim())
          .filter((content): content is string => Boolean(content && content.length > 0))
      : [];

    if (!snippets.length) {
      return { used: false as const, content: "" };
    }

    const context = snippets.map((snippet) => `- ${snippet}`).join("\n");
    return {
      used: true as const,
      content: `Relevant context:\n${context}`,
    };
  } catch (error) {
    console.warn("RAG search threw", error);
    return { used: false as const, content: "" };
  }
}

function buildModelMessages(
  history: Message[],
  systemPrompt: string,
  ragMessage: { used: boolean; content: string }
): ChatCompletionMessage[] {
  if (!history.length) {
    return [{ role: "system", content: systemPrompt }];
  }

  const trimmedHistory = history.slice(-HISTORY_LIMIT);
  const lastMessage = trimmedHistory.at(-1);

  const priorMessages = lastMessage ? trimmedHistory.slice(0, -1) : trimmedHistory;

  const messages: ChatCompletionMessage[] = [
    { role: "system", content: systemPrompt },
    ...priorMessages.map((message) => ({ role: message.role, content: message.content })),
  ];

  if (ragMessage.used && ragMessage.content) {
    messages.push({ role: "assistant", content: ragMessage.content });
  }

  if (lastMessage) {
    messages.push({ role: lastMessage.role, content: lastMessage.content });
  }

  return messages;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as SendChatPayload;
  const text = typeof payload.text === "string" ? payload.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "Message text is required." }, { status: 400 });
  }

  const settings = getSettings();
  const model = settings.modelText ?? process.env.DEFAULT_TEXT_MODEL ?? "";
  const baseURL = settings.lmstudioBaseUrl ?? process.env.LMSTUDIO_BASE_URL ?? "";

  if (!model) {
    return NextResponse.json({ error: "Text model is not configured." }, { status: 500 });
  }

  if (!baseURL) {
    return NextResponse.json({ error: "LM Studio base URL is not configured." }, { status: 500 });
  }

  const parsedConversationId = parseConversationId(payload.conversationId);
  if (Number.isNaN(parsedConversationId)) {
    return NextResponse.json({ error: "Invalid conversationId." }, { status: 400 });
  }

  let conversation: Conversation;

  if (parsedConversationId) {
    const existing = getConversation(parsedConversationId);
    if (!existing) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
    conversation = existing;
  } else {
    conversation = newConversation(normalizeConversationTitle(text));
  }

  addMessage({ conversationId: conversation.id, role: "user", content: text });

  const persona = getPersona();
  const systemPrompt = buildSystemPrompt(persona);
  const ragMessage = await runRagSearch(text, request.url, settings.ragTopK ?? undefined);
  const history = listMessages(conversation.id);
  const messages = buildModelMessages(history, systemPrompt, ragMessage);

  try {
    const completion = await chatCompletion(messages, model, baseURL, {
      temperature: persona.temperature,
    });

    addMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: completion.text,
      usedRag: ragMessage.used,
    });

    return NextResponse.json({ conversationId: conversation.id, text: completion.text });
  } catch (error) {
    console.error("LM Studio completion failed", error);
    return NextResponse.json({ error: "Failed to generate a reply." }, { status: 502 });
  }
}
