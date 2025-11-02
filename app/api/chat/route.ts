import { NextResponse } from "next/server";

type ChatPayload = {
  messages?: Array<{ role: string; content: string }>;
};

export async function GET() {
  return NextResponse.json({
    message: "Chat endpoint is ready",
    reply: "Hello!"
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as ChatPayload;
  const lastMessage = payload.messages?.at(-1)?.content ?? "";

  return NextResponse.json({
    message: "Chat processed (mock)",
    reply: lastMessage ? `You said: ${lastMessage}` : "Send a message to get started."
  });
}
