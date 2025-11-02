import { NextResponse } from "next/server";

type SpeechPayload = {
  text?: string;
};

export async function GET() {
  return NextResponse.json({
    message: "Speech endpoint is ready",
    voices: [process.env.TTS_VOICE ?? "alloy"]
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as SpeechPayload;
  return NextResponse.json({
    message: "Speech synthesis requested (mock)",
    text: payload.text ?? ""
  });
}
