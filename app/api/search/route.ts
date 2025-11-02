import { NextResponse } from "next/server";

import { embedTexts } from "@/lib/embeddings";
import { getSettings, searchTopK } from "@/lib/db";

function resolveDefaultK(): number {
  const settings = getSettings();
  const settingsK = typeof settings.ragTopK === "number" && Number.isFinite(settings.ragTopK)
    ? settings.ragTopK
    : undefined;

  if (settingsK && settingsK > 0) {
    return Math.floor(settingsK);
  }

  const envValue = process.env.RAG_TOP_K ? Number.parseInt(process.env.RAG_TOP_K, 10) : Number.NaN;
  if (Number.isFinite(envValue) && envValue > 0) {
    return Math.floor(envValue);
  }

  return 5;
}

function resolveK(searchParams: URLSearchParams): number {
  const raw = searchParams.get("k");
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return resolveDefaultK();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter 'q'." }, { status: 400 });
  }

  const k = resolveK(searchParams);
  if (k <= 0) {
    return NextResponse.json({ query, k: 0, results: [] });
  }

  let queryEmbedding: Float32Array;
  try {
    const [embedding] = await embedTexts([query]);
    if (!embedding) {
      throw new Error("Embedding not returned for query");
    }
    queryEmbedding = embedding;
  } catch (error) {
    console.error("Failed to embed search query", error);
    return NextResponse.json({ error: "Failed to generate embedding for query." }, { status: 502 });
  }

  const results = searchTopK(queryEmbedding, k);

  return NextResponse.json({
    query,
    k,
    results: results.map((result) => ({
      chunkId: result.chunkId,
      documentId: result.documentId,
      chunkIndex: result.chunkIndex,
      content: result.content,
      score: result.score,
    })),
  });
}
