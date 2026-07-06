/**
 * ragClient.ts
 *
 * Type-safe API client for the Query.AI backend.
 * All network calls go through this module, keeping components
 * free of fetch/URL logic and making it easy to mock in tests.
 *
 * Two-phase RAG flow:
 *   Phase 1 — ingestDocument(file)  → POST /ingest   (parse+embed+store)
 *   Phase 2 — queryDocument(query)  → POST /query    (search+generate)
 */

/** Base URL for the backend — defaults to localhost:3001 in development. */
const API_BASE = "http://localhost:3001";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single document chunk retrieved from Qdrant during the search step. */
export interface RetrievedChunk {
  text: string;
  score: number;
}

/** Response from POST /ingest (Phase 1 — document ingestion). */
export interface IngestResponse {
  message: string;
  totalChunks: number;
  collection: string;
}

/** Response from POST /query (Phase 2 — retrieval + generation). */
export interface QueryResponse {
  answer: string;
  context: RetrievedChunk[];
  meta: {
    model: string;
    collection: string;
    chunksUsed: number;
  };
}

/** The response from GET /create-collection. */
export interface CreateCollectionResponse {
  message?: string;
  config?: { vectorSize: number; distance: string };
  error?: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Phase 1 — Ingest
// ---------------------------------------------------------------------------

/**
 * Uploads a PDF to the backend which parses it, splits it into chunks,
 * embeds each chunk with Gemini, and upserts all vectors into Qdrant.
 *
 * This is Phase 1 and should be called when the user selects a document
 * (before any questions are asked).
 *
 * @param file - The PDF file to ingest.
 * @returns Ingestion summary including total chunks indexed.
 * @throws If the request fails or the server returns an error.
 */
export async function ingestDocument(file: File): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("pdf", file);

  const response = await fetch(`${API_BASE}/ingest`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: string }).error ??
      `Server error: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<IngestResponse>;
}

// ---------------------------------------------------------------------------
// Phase 2 — Query
// ---------------------------------------------------------------------------

/**
 * Sends a natural-language query to the backend, which embeds it, performs
 * a semantic search over the previously ingested document, and returns an
 * LLM-generated answer grounded in the retrieved context.
 *
 * This is Phase 2 and should be called each time the user sends a message.
 * The document must have been ingested first via `ingestDocument`.
 *
 * @param query - The user's natural-language question.
 * @returns The LLM answer with supporting context chunks.
 * @throws If the request fails or no relevant context is found.
 */
export async function queryDocument(query: string): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: string }).error ??
      `Server error: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<QueryResponse>;
}

// ---------------------------------------------------------------------------
// Utility — Collection setup
// ---------------------------------------------------------------------------

/**
 * Calls the one-time collection setup endpoint on the backend.
 * Should be invoked once before any ingestion if the collection doesn't exist.
 *
 * @returns The server's response message.
 */
export async function createCollection(): Promise<CreateCollectionResponse> {
  const response = await fetch(`${API_BASE}/create-collection`);
  return response.json() as Promise<CreateCollectionResponse>;
}
