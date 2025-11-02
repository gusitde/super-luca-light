import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { addChunks, addDocument, getSettings } from "@/lib/db";
import { chunkText } from "@/lib/chunker";
import { embedTexts } from "@/lib/embeddings";

export const runtime = "nodejs";

const UPLOAD_DIRECTORY = path.join(process.cwd(), "uploads");
const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

type SupportedFileKind = "pdf" | "docx" | "txt";

async function ensureUploadDirectory() {
  await fs.mkdir(UPLOAD_DIRECTORY, { recursive: true });
}

async function removeIfExists(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore cleanup errors
  }
}

function sanitizeFileName(name: string): string {
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload";
}

function detectFileKind(file: File): SupportedFileKind | null {
  const extension = file.name?.toLowerCase() ?? "";
  const mimeType = file.type?.toLowerCase() ?? "";

  if (mimeType === "application/pdf" || extension.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension.endsWith(".docx")
  ) {
    return "docx";
  }

  if (mimeType === "text/plain" || extension.endsWith(".txt")) {
    return "txt";
  }

  return null;
}

async function extractText(kind: SupportedFileKind, buffer: Buffer): Promise<string> {
  if (kind === "txt") {
    return buffer.toString("utf8");
  }

  if (kind === "pdf") {
    const pdfModule = await import("pdf-parse");
    const pdfParse = (pdfModule.default ?? pdfModule) as (data: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return result.text ?? "";
  }

  const mammothModule = await import("mammoth");
  const mammoth = (mammothModule.default ?? mammothModule) as {
    extractRawText: (options: { buffer: Buffer }) => Promise<{ value: string }>;
  };
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

export async function POST(request: Request) {
  let storagePath: string | null = null;
  let documentCreated = false;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
    }

    if (!file.size) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum supported size is 20MB." },
        { status: 413 }
      );
    }

    const fileKind = detectFileKind(file);
    if (!fileKind) {
      return NextResponse.json({ error: "Unsupported file type. Upload PDF, DOCX, or TXT files." }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await ensureUploadDirectory();

    const storedName = `${Date.now()}_${sanitizeFileName(file.name)}`;
    storagePath = path.join(UPLOAD_DIRECTORY, storedName);
    await fs.writeFile(storagePath, buffer);

    const rawText = await extractText(fileKind, buffer);
    if (!rawText.trim()) {
      await removeIfExists(storagePath);
      return NextResponse.json({ error: "Unable to extract text from the uploaded document." }, { status: 400 });
    }

    const settings = getSettings();
    const chunks = chunkText(rawText, {
      chunkSize: settings.chunkSize ?? undefined,
      chunkOverlap: settings.chunkOverlap ?? undefined,
    });

    if (chunks.length === 0) {
      await removeIfExists(storagePath);
      return NextResponse.json({ error: "Document text is too short to create chunks." }, { status: 400 });
    }

    const embeddings = await embedTexts(chunks);

    if (embeddings.length !== chunks.length) {
      await removeIfExists(storagePath);
      return NextResponse.json({ error: "Embedding generation failed" }, { status: 500 });
    }

    const documentRecord = addDocument({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storagePath,
    });
    documentCreated = true;

    const chunkRecords = addChunks(
      chunks.map((content, index) => ({
        documentId: documentRecord.id,
        chunkIndex: index,
        content,
        embedding: embeddings[index],
      }))
    );

    return NextResponse.json(
      {
        document: {
          ...documentRecord,
          chunkCount: chunkRecords.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to upload document", error);
    if (storagePath && !documentCreated) {
      await removeIfExists(storagePath);
    }
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
