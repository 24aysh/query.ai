import { Router, type Request, type Response } from "express";
import multer from "multer";
import fs from "fs";
import pdfParse from "pdf-parse";
import { env } from "../config";
import { chunkText, upsertChunks } from "../rag";

const router = Router();

const upload = multer({ dest: "uploads/" });

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

      const fileBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(fileBuffer);
      const rawText = pdfData.text;

      if (!rawText || rawText.trim().length === 0) {
        res.status(400).json({ error: "PDF is empty or could not be parsed." });
        return;
      }

      const chunks = chunkText(rawText);

      const totalChunks = await upsertChunks(chunks, env.COLLECTION_NAME);

      res.status(200).json({
        message: "Document ingested successfully.",
        totalChunks,
        collection: env.COLLECTION_NAME,
      });
    } catch (err) {
      console.error("[/ingest] Error:", err);
      res.status(500).json({
        error: "Failed to ingest document.",
        detail: err instanceof Error ? err.message : String(err),
      });
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }
);

export default router;
