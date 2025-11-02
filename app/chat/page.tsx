"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Conversation {
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
  conversations?: Conversation[];
}

interface MessagesResponse {
  messages?: ChatMessage[];
}

interface SendResponse {
  conversationId: number;
  text: string;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollMessagesToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollMessagesToBottom();
  }, [messages, scrollMessagesToBottom]);

  const loadConversations = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/chat/conversations", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = (await response.json()) as ConversationsResponse;
      const list = Array.isArray(data.conversations) ? data.conversations : [];
      setConversations(list);
      setSelectedConversationId((current) => {
        if (current !== null) {
          return current;
        }
        return list.length > 0 ? list[0]!.id : null;
      });
    } catch (fetchError) {
      console.error("Failed to load conversations", fetchError);
      setError("Failed to load conversations.");
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: number) => {
    setError(null);
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/chat/messages?conversationId=${conversationId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = (await response.json()) as MessagesResponse;
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (fetchError) {
      console.error("Failed to load messages", fetchError);
      setMessages([]);
      setError("Failed to load messages.");
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversationId !== null) {
      void loadMessages(selectedConversationId);
    } else {
      setMessages([]);
    }
  }, [selectedConversationId, loadMessages]);

  const handleSelectConversation = useCallback((conversationId: number) => {
    setSelectedConversationId(conversationId);
    setError(null);
  }, []);

  const handleNewConversation = useCallback(() => {
    setSelectedConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  const handleSend = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const text = inputValue.trim();
      if (!text || isSending) {
        return;
      }

      setIsSending(true);
      setError(null);
      setInputValue("");

      const optimisticMessage: ChatMessage = {
        id: Date.now(),
        conversationId: selectedConversationId ?? -1,
        role: "user",
        content: text,
        usedRag: false,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const response = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: selectedConversationId ?? undefined,
            text,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as SendResponse;
        setSelectedConversationId(data.conversationId);

        await loadConversations();
      } catch (sendError) {
        console.error("Failed to send message", sendError);
        setError("Failed to send message. Please try again.");
        setInputValue(text);
        setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
      } finally {
        setIsSending(false);
      }
    },
    [inputValue, isSending, selectedConversationId, loadConversations]
  );

  const formattedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Chat</h1>
        <p className="text-sm text-slate-600">
          Manage conversations and chat with your assistant powered by LM Studio. Retrieve documents through RAG
          automatically when helpful.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="flex max-h-[70vh] flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Conversations</h2>
            <button
              type="button"
              onClick={handleNewConversation}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              New
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-500">No conversations yet.</p>
            ) : (
              conversations.map((conversation) => {
                const isSelected = conversation.id === selectedConversationId;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="line-clamp-2 font-medium">{conversation.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {new Date(conversation.updatedAt).toLocaleString()}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="flex max-h-[70vh] flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {selectedConversation ? selectedConversation.title : "New Conversation"}
              </h2>
              {selectedConversation && (
                <p className="text-xs text-slate-500">Last updated {new Date(selectedConversation.updatedAt).toLocaleString()}</p>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto rounded-md bg-slate-50 p-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            {isLoadingMessages && formattedMessages.length === 0 ? (
              <p className="text-sm text-slate-500">Loading messages…</p>
            ) : formattedMessages.length === 0 ? (
              <p className="text-sm text-slate-500">Start the conversation by sending a message.</p>
            ) : (
              formattedMessages.map((message) => {
                const isAssistant = message.role === "assistant";
                return (
                  <div key={message.id} className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 text-sm shadow ${
                        isAssistant ? "bg-white text-slate-800" : "bg-blue-600 text-white"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className={isAssistant ? "text-slate-400" : "text-blue-200"}>
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </span>
                        {isAssistant && message.usedRag && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            RAG used
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="flex items-end gap-3" onSubmit={handleSend}>
            <textarea
              rows={3}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Type your message here..."
              className="h-24 flex-1 resize-none rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="submit"
              disabled={isSending || !inputValue.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSending ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
