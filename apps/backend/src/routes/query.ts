import { Router, type Request, type Response } from "express";
import { env, llm } from "../config";
import { searchSimilar } from "../rag";

const router = Router();

const GENERATION_MODEL = "gemini-2.5-flash";

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const query = (req.body.query as string | undefined)?.trim();
    if (!query) {
      res.status(400).json({ error: "Missing or empty 'query' field in request body." });
      return;
    }

    const relevantChunks = await searchSimilar(query, env.COLLECTION_NAME, 3);

    if (relevantChunks.length === 0) {
      res.status(404).json({
        error: "No relevant context found. Please ingest a document first via POST /ingest.",
      });
      return;
    }

    const context = relevantChunks.map((c) => c.text).join("\n\n");
    const prompt = buildRagPrompt(query, context);

    const genResponse = await llm.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
    });

    const answer =
      genResponse.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Sorry, I could not generate an answer from the document.";

    res.status(200).json({
      answer,
      context: relevantChunks,
      meta: {
        model: GENERATION_MODEL,
        collection: env.COLLECTION_NAME,
        chunksUsed: relevantChunks.length,
      },
    });
  } catch (err) {
    console.error("[/query] Error:", err);
    res.status(500).json({
      error: "Failed to process query.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});


function buildRagPrompt(query: string, context: string): string {
  return `You are a helpful AI assistant. Answer the user's question using ONLY the provided context from the document. If the answer cannot be found in the context, say so clearly — do not make up information.

CONTEXT FROM DOCUMENT:
${context}

USER QUESTION:
${query}

ANSWER:`;
}

export default router;
