export interface ChunkerOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

const DEFAULT_CHUNK_SIZE = 1100;
const DEFAULT_CHUNK_OVERLAP = 120;

function sanitizeText(input: string): string {
  return input.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").trim();
}

export function chunkText(text: string, options: ChunkerOptions = {}): string[] {
  const chunkSize = Math.max(1, options.chunkSize ?? DEFAULT_CHUNK_SIZE);
  const chunkOverlap = Math.min(chunkSize - 1, Math.max(0, options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP));

  const cleaned = sanitizeText(text);
  if (!cleaned.length) {
    return [];
  }

  const chunks: string[] = [];
  const step = chunkSize - chunkOverlap;

  for (let start = 0; start < cleaned.length; start += step) {
    const end = Math.min(cleaned.length, start + chunkSize);
    const slice = cleaned.slice(start, end).trim();
    if (slice.length > 0) {
      chunks.push(slice);
    }

    if (end === cleaned.length) {
      break;
    }
  }

  return chunks;
}
