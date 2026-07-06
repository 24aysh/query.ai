import { config } from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";

config();

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
  COLLECTION_NAME: process.env.COLLECTION_NAME ?? "query_ai",
};

export const llm = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

export const qdrantClient = new QdrantClient({
  url: env.CLUSTER_ENDPOINT,
  apiKey: env.QUADRANT_API_KEY,
});
