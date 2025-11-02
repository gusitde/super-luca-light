import { NextResponse } from "next/server";

type SearchPayload = {
  query?: string;
};

export async function GET() {
  return NextResponse.json({
    message: "Search endpoint is ready",
    results: []
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as SearchPayload;
  return NextResponse.json({
    message: "Search executed (mock)",
    query: payload.query ?? "",
    results: []
  });
}
