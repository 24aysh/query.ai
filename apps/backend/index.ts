import express from "express";
import cors from "cors";
import { env } from "./src/config";
import ingestRouter from "./src/routes/ingest";
import queryRouter from "./src/routes/query";
import uploadRouter from "./src/routes/upload";
import collectionRouter from "./src/routes/collection";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "*",
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

app.use("/ingest", ingestRouter);

app.use("/query", queryRouter);

app.use("/uploads", uploadRouter);

app.use("/create-collection", collectionRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(env.PORT, () => {
  console.log(`🚀 Query.AI backend running on port ${env.PORT}`);
});