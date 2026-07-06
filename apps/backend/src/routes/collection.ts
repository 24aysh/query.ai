import { Router, type Request, type Response } from "express";
import { qdrantClient, env } from "../config";

const router = Router();

const VECTOR_SIZE = 3072;

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
    console.error("[/create-collection] Error:", err);
    res.status(500).json({
      error: "Failed to create collection. It may already exist.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
