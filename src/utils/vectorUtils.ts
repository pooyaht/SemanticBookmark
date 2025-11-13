export function cosineSimilarity(
  vecA: Float32Array,
  vecB: Float32Array
): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i]! * vecB[i]!;
    normA += vecA[i]! * vecA[i]!;
    normB += vecB[i]! * vecB[i]!;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

export function normalizeVector(vector: Float32Array): Float32Array {
  let magnitude = 0;
  for (let i = 0; i < vector.length; i++) {
    magnitude += vector[i]! * vector[i]!;
  }

  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) {
    return vector;
  }

  const normalized = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i]! / magnitude;
  }

  return normalized;
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function truncateToTokenLimit(
  text: string,
  maxTokens: number
): { text: string; isTruncated: boolean; tokenCount: number } {
  const estimatedTokens = estimateTokenCount(text);

  if (estimatedTokens <= maxTokens) {
    return {
      text,
      isTruncated: false,
      tokenCount: estimatedTokens,
    };
  }

  const maxChars = maxTokens * 4;
  let truncated = text.substring(0, maxChars);

  const lastSpaceIndex = truncated.lastIndexOf(' ');
  if (lastSpaceIndex > maxChars * 0.8) {
    truncated = truncated.substring(0, lastSpaceIndex);
  }

  return {
    text: truncated,
    isTruncated: true,
    tokenCount: estimateTokenCount(truncated),
  };
}
