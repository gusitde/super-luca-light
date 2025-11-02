import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_STT_MODEL = process.env.OPENAI_STT_MODEL ?? "gpt-4o-mini-transcribe";

export async function POST(request: Request) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key is not configured." }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("Failed to parse speech form data", error);
    return NextResponse.json({ error: "Invalid speech request payload." }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }

  const filename = audio instanceof File && typeof audio.name === "string" && audio.name
    ? audio.name
    : "speech.webm";

  const openaiFormData = new FormData();
  openaiFormData.append("file", audio, filename);
  openaiFormData.append("model", DEFAULT_STT_MODEL);

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: openaiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI transcription failed", response.status, errorText);
      return NextResponse.json({ error: "Unable to transcribe audio." }, { status: 502 });
    }

    const data = (await response.json()) as { text?: string };
    return NextResponse.json({ text: data.text ?? "" }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error requesting OpenAI transcription", error);
    return NextResponse.json({ error: "Speech-to-text service is unavailable." }, { status: 500 });
  }
}
