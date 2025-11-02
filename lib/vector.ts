export function cosine(a: Float32Array, b: Float32Array): number {
  const minLength = Math.min(a.length, b.length);

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < minLength; i += 1) {
    const valueA = a[i];
    const valueB = b[i];
    dot += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }

  for (let i = minLength; i < a.length; i += 1) {
    const valueA = a[i];
    normA += valueA * valueA;
  }

  for (let i = minLength; i < b.length; i += 1) {
    const valueB = b[i];
    normB += valueB * valueB;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / Math.sqrt(normA * normB);
}
