import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? "tts-1";
const DEFAULT_TTS_VOICE = process.env.OPENAI_TTS_VOICE ?? "alloy";

interface SpeechRequest {
  text?: string;
}

export async function POST(request: Request) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key is not configured." }, { status: 500 });
  }

  let payload: SpeechRequest;
  try {
    payload = (await request.json()) as SpeechRequest;
  } catch (error) {
    console.error("Invalid TTS request payload", error);
    return NextResponse.json({ error: "Invalid text-to-speech payload." }, { status: 400 });
  }

  const text = payload.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Text is required for speech synthesis." }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_TTS_MODEL,
        voice: DEFAULT_TTS_VOICE,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI TTS failed", response.status, errorText);
      return NextResponse.json({ error: "Unable to synthesize speech." }, { status: 502 });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error requesting OpenAI TTS", error);
    return NextResponse.json({ error: "Text-to-speech service is unavailable." }, { status: 500 });
  }
}
