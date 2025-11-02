import { NextResponse } from "next/server";

import { listConversations } from "@/lib/db";

export async function GET() {
  const conversations = listConversations().map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  }));

  return NextResponse.json({ conversations });
}
