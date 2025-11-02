import { NextResponse } from "next/server";

type SettingsPayload = Record<string, unknown>;

export async function GET() {
  return NextResponse.json({
    message: "Settings endpoint is ready",
    data: {
      ragTopK: process.env.RAG_TOP_K ?? null,
      chunkSize: process.env.CHUNK_SIZE ?? null,
      chunkOverlap: process.env.CHUNK_OVERLAP ?? null
    }
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as SettingsPayload;
  return NextResponse.json({
    message: "Settings saved (mock)",
    payload
  });
}
