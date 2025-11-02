"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ConversationSummary {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  usedRag: boolean;
  createdAt: string;
}

interface ConversationsResponse {
  conversations?: ConversationSummary[];
}

interface MessagesResponse {
  conversation?: ConversationSummary;
  messages?: ChatMessage[];
}

interface SendResponse {
  conversationId: number;
  text: string;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const selectedConversationRef = useRef<number | null>(null);
  const pendingMessagesRef = useRef<number | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    selectedConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const response = await fetch("/api/chat/conversations");
      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.status}`);
      }
      const data = (await response.json()) as ConversationsResponse;
      setConversations(data.conversations ?? []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to load conversations.");
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: number) => {
    pendingMessagesRef.current = conversationId;
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
      }
      const data = (await response.json()) as MessagesResponse;
      if (selectedConversationRef.current === conversationId) {
        setMessages(data.messages ?? []);
        setError(null);
      }
    } catch (err) {
      console.error(err);
      if (selectedConversationRef.current === conversationId) {
        setError("Unable to load messages.");
      }
    } finally {
      if (pendingMessagesRef.current === conversationId) {
        setIsLoadingMessages(false);
        pendingMessagesRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    fetchConversations().catch(() => {
      /* handled in fetchConversations */
    });
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversationId === null) {
      setMessages([]);
      return;
    }

    fetchMessages(selectedConversationId).catch(() => {
      /* handled in fetchMessages */
    });
  }, [fetchMessages, selectedConversationId]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (isSending) {
        return;
      }

      const trimmed = input.trim();
      if (!trimmed) {
        return;
      }

      setIsSending(true);
      setError(null);

      try {
        const response = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: selectedConversationId ?? undefined,
            text: trimmed,
          }),
        });

        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errorPayload?.error ?? "Failed to send message");
        }

        const data = (await response.json()) as SendResponse;
        setInput("");
        setSelectedConversationId(data.conversationId);
        await fetchConversations();
        await fetchMessages(data.conversationId);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to send message.");
      } finally {
        setIsSending(false);
      }
    },
    [fetchConversations, fetchMessages, input, isSending, selectedConversationId]
  );

  const handleConversationSelect = useCallback((conversationId: number) => {
    setSelectedConversationId(conversationId);
  }, []);

  const handleNewConversation = useCallback(() => {
    setSelectedConversationId(null);
    setMessages([]);
    setInput("");
  }, []);

  return (
    <section className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 rounded-lg border border-slate-200 bg-white lg:w-72">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Conversations</h2>
          <button
            type="button"
            onClick={handleNewConversation}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            New
          </button>
        </div>
        <div className="max-h-[520px] overflow-y-auto px-2 py-2">
          {isLoadingConversations ? (
            <p className="px-2 py-3 text-sm text-slate-500">Loading conversations…</p>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-3 text-sm text-slate-500">No conversations yet.</p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conversation) => {
                const isActive = conversation.id === selectedConversationId;
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => handleConversationSelect(conversation.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? "bg-slate-900 text-white shadow"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <p className="truncate font-medium">{conversation.title || "Untitled conversation"}</p>
                      <p className={`mt-1 text-xs ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                        {new Date(conversation.updatedAt).toLocaleString()}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <div className="flex min-h-[560px] flex-1 flex-col rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">Chat</h1>
          <p className="mt-1 text-sm text-slate-500">
            {selectedConversation ? selectedConversation.title : "Start a new conversation to begin chatting."}
          </p>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {isLoadingMessages ? (
            <p className="text-sm text-slate-500">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500">No messages yet. Send a message to get started.</p>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xl rounded-lg border px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? "border-blue-200 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide">
                        <span className={isUser ? "text-blue-100" : "text-slate-500"}>{isUser ? "You" : "Assistant"}</span>
                        {message.usedRag && !isUser && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            RAG used
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>
          )}
        </div>
        <form onSubmit={handleSend} className="border-t border-slate-200 px-6 py-4">
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="chat-input">
            Message
          </label>
          <textarea
            id="chat-input"
            className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Type your message here…"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isSending}
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSending}
            >
              {isSending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
