import { NextResponse } from "next/server";

type DocumentPayload = {
  title?: string;
  content?: string;
};

export async function GET() {
  return NextResponse.json({
    message: "Documents endpoint is ready",
    documents: []
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as DocumentPayload;
  return NextResponse.json({
    message: "Document uploaded (mock)",
    document: payload
  });
}
