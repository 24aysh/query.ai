import { qdrantClient } from "./config";
import { createEmbedding } from "./embeddings";

export interface EmbeddedChunk {
  text: string;
  vector: number[];
}

export interface RetrievedChunk {
  text: string;
  score: number;
}

export function chunkText(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

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
