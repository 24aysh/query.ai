import { llm } from "./config";

const EMBEDDING_MODEL = "gemini-embedding-2";

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
