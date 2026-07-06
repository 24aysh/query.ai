/**
 * rag.ts
 *
 * Core Retrieval-Augmented Generation (RAG) pipeline helpers.
 * This module handles the three stages of RAG:
 *   1. Chunking — split raw text into overlapping passages
 *   2. Indexing  — embed each chunk and upsert into Qdrant
 *   3. Retrieval — embed the user query and fetch the most similar chunks
 */

import { qdrantClient } from "./config";
import { createEmbedding } from "./embeddings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single chunk with its pre-computed embedding ready to be upserted. */
export interface EmbeddedChunk {
  text: string;
  vector: number[];
}

/** A retrieved chunk returned by the similarity search. */
export interface RetrievedChunk {
  text: string;
  score: number;
}

// ---------------------------------------------------------------------------
// 1. Chunking
// ---------------------------------------------------------------------------

/**
 * Splits raw text into non-empty paragraphs (double-newline delimited).
 *
 * Strategy: double-newline splitting preserves natural paragraph boundaries
 * from PDF-extracted text. Empty or whitespace-only segments are discarded.
 *
 * @param text - The full extracted text of the document.
 * @returns An array of non-empty text chunks.
 */
export function chunkText(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

// ---------------------------------------------------------------------------
// 2. Indexing
// ---------------------------------------------------------------------------

/**
 * Embeds each text chunk and upserts all resulting vectors into a Qdrant
 * collection in a single batched request.
 *
 * Note: IDs are assigned sequentially starting from 1. Re-uploading the
 * same document will overwrite existing points with the same IDs via upsert.
 *
 * @param chunks   - Plain-text chunks to embed and store.
 * @param collectionName - Target Qdrant collection.
 * @returns The total number of chunks indexed.
 */
export async function upsertChunks(
  chunks: string[],
  collectionName: string
): Promise<number> {
  // Embed all chunks (sequential to respect API rate limits)
  const embeddedChunks: EmbeddedChunk[] = [];
  for (const chunk of chunks) {
    const vector = await createEmbedding(chunk);
    embeddedChunks.push({ text: chunk, vector });
  }

  // Build Qdrant point objects
  const points = embeddedChunks.map((item, idx) => ({
    id: idx + 1,
    vector: item.vector,
    payload: { text: item.text },
  }));

  // Batch upsert into Qdrant
  await qdrantClient.upsert(collectionName, { points });

  return points.length;
}

// ---------------------------------------------------------------------------
// 3. Retrieval
// ---------------------------------------------------------------------------

/**
 * Embeds a user query and searches the Qdrant collection for the most
 * semantically similar document chunks.
 *
 * @param query          - The user's natural-language question.
 * @param collectionName - Qdrant collection to search.
 * @param limit          - Maximum number of chunks to return (default: 3).
 * @returns An array of retrieved chunks with their similarity scores.
 */
export async function searchSimilar(
  query: string,
  collectionName: string,
  limit = 3
): Promise<RetrievedChunk[]> {
  const queryVector = await createEmbedding(query);

  const results = await qdrantClient.search(collectionName, {
    vector: queryVector,
    limit,
    with_payload: true,
    timeout: 20,
  });

  return results.map((hit) => ({
    text: String((hit.payload as { text?: string })?.text ?? ""),
    score: hit.score,
  }));
}
