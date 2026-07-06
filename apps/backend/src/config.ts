/**
 * config.ts
 *
 * Centralised configuration module. Initialises and exports the shared
 * Google GenAI client, Qdrant vector-database client, and validated
 * environment variables so every other module can import from a single
 * source of truth.
 */

import { config } from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";

// Load .env into process.env (must be called before reading any env vars)
config();

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

/**
 * Asserts that a required environment variable is present and non-empty.
 * Throws at startup so misconfiguration is caught immediately.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),
  QUADRANT_API_KEY: requireEnv("QUADRANT_API_KEY"),
  CLUSTER_ENDPOINT: requireEnv("CLUSTER_ENDPOINT"),
  PORT: Number(process.env.PORT ?? 3001),
  /** Name of the Qdrant collection used for storing document embeddings */
  COLLECTION_NAME: process.env.COLLECTION_NAME ?? "query_ai",
};

// ---------------------------------------------------------------------------
// Shared client instances
// ---------------------------------------------------------------------------

/**
 * Google GenAI client — used for both embeddings and content generation.
 * Uses the `gemini-embedding-exp-03-07` model (3072-dim) for embeddings
 * and `gemini-2.5-flash-lite` for chat completions.
 */
export const llm = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

/**
 * Qdrant REST client — connects to the managed Qdrant cluster defined
 * in the environment variables.
 */
export const qdrantClient = new QdrantClient({
  url: env.CLUSTER_ENDPOINT,
  apiKey: env.QUADRANT_API_KEY,
});
