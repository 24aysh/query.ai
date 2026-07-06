/**
 * routes/collection.ts
 *
 * GET /create-collection
 *
 * One-time setup endpoint to create the Qdrant vector collection with the
 * correct dimensionality for the Gemini embedding model (3 072 dimensions,
 * Cosine similarity). This should be called once before the first upload.
 */

import { Router, type Request, type Response } from "express";
import { qdrantClient, env } from "../config";

const router = Router();

/**
 * Vector size for `gemini-embedding-exp-03-07`.
 * Must match the size used in `createEmbedding` or searches will fail.
 */
const VECTOR_SIZE = 3072;

// ---------------------------------------------------------------------------
// GET /create-collection
// ---------------------------------------------------------------------------

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    await qdrantClient.createCollection(env.COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      },
    });

    res.status(200).json({
      message: `Collection '${env.COLLECTION_NAME}' created successfully.`,
      config: { vectorSize: VECTOR_SIZE, distance: "Cosine" },
    });
  } catch (err) {
    // Qdrant throws if the collection already exists — surface a clear message
    console.error("[/create-collection] Error:", err);
    res.status(500).json({
      error: "Failed to create collection. It may already exist.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
