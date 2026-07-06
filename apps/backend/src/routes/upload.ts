import { Router, type Request, type Response } from "express";
import multer from "multer";
import fs from "fs";
import pdfParse from "pdf-parse";
import { env, llm } from "../config";
import { chunkText, upsertChunks, searchSimilar } from "../rag";

const router = Router();

const upload = multer({ dest: "uploads/" });

const GENERATION_MODEL = "gemini-2.5-flash-lite";

router.post(
  "/",
  upload.single("pdf"),
  async (req: Request, res: Response): Promise<void> => {
    const tempFilePath = req.file?.path;

    try {
      if (!req.file) {
        res.status(400).json({ error: "No PDF file uploaded. Use field name 'pdf'." });
        return;
      }

      const query = (req.body.query as string | undefined)?.trim();
      if (!query) {
        res.status(400).json({ error: "Missing 'query' field in request body." });
        return;
      }

      const fileBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(fileBuffer);
      const rawText = pdfData.text;

      if (!rawText || rawText.trim().length === 0) {
        res.status(400).json({ error: "PDF is empty or could not be parsed." });
        return;
      }

      const chunks = chunkText(rawText);
      const totalChunks = await upsertChunks(chunks, env.COLLECTION_NAME);

      const relevantChunks = await searchSimilar(query, env.COLLECTION_NAME, 3);
      const context = relevantChunks.map((c) => c.text).join("\n\n");

      const prompt = buildRagPrompt(query, context);

      const genResponse = await llm.models.generateContent({
        model: GENERATION_MODEL,
        contents: prompt,
      });

      const answer =
        genResponse.candidates?.[0]?.content?.parts?.[0]?.text ??
        "Sorry, I could not generate an answer.";

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
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }
);


function buildRagPrompt(query: string, context: string): string {
  return `You are a helpful AI assistant. Answer the user's question using ONLY the provided context from the document. If the answer cannot be found in the context, say so clearly.

CONTEXT FROM DOCUMENT:
${context}

USER QUESTION:
${query}

ANSWER:`;
}

export default router;
