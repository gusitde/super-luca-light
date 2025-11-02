import { NextResponse } from "next/server";

import { getConversation, listMessages } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("conversationId");

  if (!idParam) {
    return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
  }

  const conversationId = Number.parseInt(idParam, 10);
  if (!Number.isFinite(conversationId) || conversationId <= 0) {
    return NextResponse.json({ error: "conversationId must be a positive integer" }, { status: 400 });
  }

  const conversation = getConversation(conversationId);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const messages = listMessages(conversationId).map((message) => ({
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    usedRag: message.usedRag,
    createdAt: message.createdAt,
  }));

  return NextResponse.json({ conversation, messages });
}
