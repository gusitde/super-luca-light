import { NextResponse } from "next/server";

import { getConversation, listMessages } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationIdParam = searchParams.get("conversationId");

  if (!conversationIdParam) {
    return NextResponse.json({ error: "Missing 'conversationId' query parameter." }, { status: 400 });
  }

  const conversationId = Number.parseInt(conversationIdParam, 10);
  if (!Number.isFinite(conversationId) || conversationId <= 0) {
    return NextResponse.json({ error: "Invalid 'conversationId' query parameter." }, { status: 400 });
  }

  const conversation = getConversation(conversationId);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const messages = listMessages(conversationId);
  return NextResponse.json({ messages });
}
