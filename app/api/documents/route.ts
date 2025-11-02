import { NextResponse } from "next/server";

import { listDocumentsWithChunkCounts } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const documents = listDocumentsWithChunkCounts().map((document) => ({
    id: document.id,
    filename: document.filename,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    storagePath: document.storagePath,
    createdAt: document.createdAt,
    chunkCount: document.chunkCount,
  }));

  return NextResponse.json({
    documents,
  });
}

export async function POST() {
  return NextResponse.json({
    error: "Use /api/documents/upload to create documents",
  }, { status: 405 });
}
