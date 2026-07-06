/**
 * utils.ts
 *
 * General-purpose mathematical utility functions.
 *
 * Note: Qdrant performs cosine similarity natively during vector search,
 * so these helpers are provided for local/offline use cases only
 * (e.g., unit testing, reranking, or debugging embedding quality).
 */

/**
 * Computes the cosine similarity between two numeric vectors.
 *
 * Cosine similarity measures the cosine of the angle between two vectors,
 * giving a score in [-1, 1] where 1 means identical direction.
 *
 * Formula: cos(θ) = (A · B) / (‖A‖ × ‖B‖)
 *
 * @param a - First embedding vector.
 * @param b - Second embedding vector (must be the same length as `a`).
 * @returns A value between -1 and 1 (1 = most similar, 0 = orthogonal).
 * @throws If the vectors have different lengths or are zero-length.
 *
 * @example
 * const sim = cosineSimilarity([1, 0], [1, 0]); // 1.0
 * const sim = cosineSimilarity([1, 0], [0, 1]); // 0.0
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector length mismatch: a.length=${a.length}, b.length=${b.length}`
    );
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    magnitudeA += a[i]! * a[i]!;
    magnitudeB += b[i]! * b[i]!;
  }

  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

  if (denominator === 0) {
    throw new Error("Cannot compute cosine similarity for a zero-length vector.");
  }

  return dotProduct / denominator;
}