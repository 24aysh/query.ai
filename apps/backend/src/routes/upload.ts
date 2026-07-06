/**
 * routes/upload.ts
 *
 * POST /uploads
 *
 * The main RAG endpoint. Accepts a PDF file and a natural-language query,
 * then:
 *   1. Parses the PDF text
 *   2. Chunks and indexes the text in Qdrant (embeddings)
 *   3. Searches Qdrant for the most relevant chunks to the query
 *   4. Builds a grounded prompt and calls Gemini to generate an answer
 *   5. Returns the LLM answer along with the retrieved context
 *   6. Cleans up the temporary uploaded file from disk
 */

import { Router, type Request, type Response } from "express";
import multer from "multer";
import fs from "fs";
import pdfParse from "pdf-parse";
import { env, llm } from "../config";
import { chunkText, upsertChunks, searchSimilar } from "../rag";

const router = Router();

/** Multer storage — saves uploads to the local `uploads/` directory. */
const upload = multer({ dest: "uploads/" });

/** Gemini model used for answer generation. */
const GENERATION_MODEL = "gemini-2.5-flash-lite";

// ---------------------------------------------------------------------------
// POST /uploads
// ---------------------------------------------------------------------------

router.post(
  "/",
  upload.single("pdf"),
  async (req: Request, res: Response): Promise<void> => {
    const tempFilePath = req.file?.path;

    try {
      // ── Guard: require both a PDF and a query ──────────────────────────
      if (!req.file) {
        res.status(400).json({ error: "No PDF file uploaded. Use field name 'pdf'." });
        return;
      }

      const query = (req.body.query as string | undefined)?.trim();
      if (!query) {
        res.status(400).json({ error: "Missing 'query' field in request body." });
        return;
      }

      // ── 1. Parse PDF ───────────────────────────────────────────────────
      const fileBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(fileBuffer);
      const rawText = pdfData.text;

      if (!rawText || rawText.trim().length === 0) {
        res.status(400).json({ error: "PDF is empty or could not be parsed." });
        return;
      }

      // ── 2. Chunk & index ───────────────────────────────────────────────
      const chunks = chunkText(rawText);
      const totalChunks = await upsertChunks(chunks, env.COLLECTION_NAME);

      // ── 3. Retrieve relevant context ───────────────────────────────────
      const relevantChunks = await searchSimilar(query, env.COLLECTION_NAME, 3);
      const context = relevantChunks.map((c) => c.text).join("\n\n");

      // ── 4. Generate grounded answer ────────────────────────────────────
      const prompt = buildRagPrompt(query, context);

      const genResponse = await llm.models.generateContent({
        model: GENERATION_MODEL,
        contents: prompt,
      });

      const answer =
        genResponse.candidates?.[0]?.content?.parts?.[0]?.text ??
        "Sorry, I could not generate an answer.";

      // ── 5. Return structured response ──────────────────────────────────
      res.status(200).json({
        answer,
        context: relevantChunks,
        meta: {
          totalChunks,
          model: GENERATION_MODEL,
          collection: env.COLLECTION_NAME,
        },
      });
    } catch (err) {
      console.error("[/uploads] Error:", err);
      res.status(500).json({
        error: "An error occurred while processing the document.",
        detail: err instanceof Error ? err.message : String(err),
      });
    } finally {
      // ── 6. Clean up temp file regardless of success/failure ────────────
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the RAG prompt that instructs Gemini to answer strictly from the
 * provided context, preventing hallucination outside the document.
 *
 * @param query   - The user's original question.
 * @param context - Concatenated text of the retrieved document chunks.
 * @returns A complete prompt string ready to be sent to the LLM.
 */
function buildRagPrompt(query: string, context: string): string {
  return `You are a helpful AI assistant. Answer the user's question using ONLY the provided context from the document. If the answer cannot be found in the context, say so clearly.

CONTEXT FROM DOCUMENT:
${context}

USER QUESTION:
${query}

ANSWER:`;
}

export default router;
