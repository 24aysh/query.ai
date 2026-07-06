/**
 * embeddings.ts
 *
 * Thin wrapper around the Google GenAI embedding API.
 * Keeping embedding logic in its own module makes it easy to swap the
 * underlying model without touching the rest of the codebase.
 */

import { llm } from "./config";

/**
 * The embedding model to use for generating vector representations.
 * `gemini-embedding-exp-03-07` produces 3 072-dimensional vectors, which
 * matches the Qdrant collection's configured vector size.
 */
const EMBEDDING_MODEL = "gemini-embedding-exp-03-07";

/**
 * Generates a dense vector embedding for the provided text using Google's
 * Gemini embedding model.
 *
 * @param text - The input string to embed.
 * @returns A numeric array representing the text in embedding space.
 * @throws If the API call fails or the response contains no embeddings.
 *
 * @example
 * const vector = await createEmbedding("What is RAG?");
 * // vector is number[] with 3 072 dimensions
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const response = await llm.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error("Embedding API returned an empty response for the given text.");
  }

  return values;
}
