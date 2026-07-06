/**
 * App.tsx
 *
 * Root component for Query.AI — a RAG-powered document chatbot.
 *
 * Two-Phase RAG Flow:
 * ─────────────────────────────────────────────────────────────────────
 *  Phase 1 — Ingestion (triggered by "Upload Document" button):
 *    PDF → parse → chunk → embed each chunk → upsert into Qdrant
 *    Shows an "Uploading & Indexing" loader in the sidebar.
 *
 *  Phase 2 — Query (triggered by sending a message):
 *    query → embed → semantic search → top-k context → Gemini → answer
 *    Shows a typing indicator in the chat feed.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Layout (desktop ≥ 768 px):
 * ┌──────────────────────┬──────────────────────────────────────────┐
 * │  Sidebar             │  Chat panel                              │
 * │  ├─ Branding         │  ├─ Message feed (ChatInterface)         │
 * │  ├─ File upload      │  └─ Query input (QueryInput)             │
 * │  ├─ Upload loader    │                                          │
 * │  └─ How-it-works     │                                          │
 * └──────────────────────┴──────────────────────────────────────────┘
 */

import { useState, useCallback, useRef } from "react";
import { FileText, Sparkles, Trash2, AlertCircle, Loader2, CheckCircle2, Upload } from "lucide-react";
import { FileUpload } from "./components/FileUpload";
import { ChatInterface, type Message } from "./components/ChatInterface";
import { QueryInput } from "./components/QueryInput";
import { ingestDocument, queryDocument } from "./api/ragClient";
import "./index.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The three possible states for Phase 1 (document ingestion):
 *  - idle      → no document selected or upload not started
 *  - uploading → POST /ingest in-flight
 *  - ready     → document indexed successfully, chat is enabled
 */
type IngestState = "idle" | "uploading" | "ready";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  // ── Phase 1 state ─────────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ingestState, setIngestState] = useState<IngestState>("idle");
  const [totalChunks, setTotalChunks] = useState<number | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // ── Phase 2 state ─────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  /**
   * Monotonically increasing counter for message IDs persisted via useRef.
   * A plain `let` resets to 0 every render, causing duplicate key warnings.
   */
  const msgCounterRef = useRef(0);
  const nextId = () => `msg-${++msgCounterRef.current}`;

  // ── Phase 1 handler — Ingest document ─────────────────────────────────────

  /**
   * Handles the "Upload Document" button click.
   * Sends the selected PDF to POST /ingest, which runs:
   *   parse → chunk → embed all chunks → upsert into Qdrant
   */
  const handleIngest = useCallback(async () => {
    if (!selectedFile) {
      setIngestError("Please select a PDF file first.");
      return;
    }

    setIngestError(null);
    setIngestState("uploading");

    try {
      const result = await ingestDocument(selectedFile);
      setTotalChunks(result.totalChunks);
      setIngestState("ready");
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : "Failed to upload document.");
      setIngestState("idle");
    }
  }, [selectedFile]);

  /** When user changes file, reset Phase 1 back to idle. */
  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file);
    setIngestState("idle");
    setTotalChunks(null);
    setIngestError(null);
  }, []);

  // ── Phase 2 handler — Query ────────────────────────────────────────────────

  /**
   * Handles the "Send" action.
   * Calls POST /query which runs:
   *   embed query → semantic search in Qdrant → Gemini LLM → answer
   */
  const handleSubmit = useCallback(async () => {
    const trimmedQuery = query.trim();

    if (ingestState !== "ready") {
      setQueryError("Please upload and index a document first.");
      return;
    }
    if (!trimmedQuery) {
      setQueryError("Please type a question.");
      return;
    }

    setQueryError(null);
    setIsQuerying(true);

    // Append user message immediately so the UI feels responsive
    const userMessage: Message = {
      id: nextId(),
      role: "user",
      content: trimmedQuery,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");

    try {
      const response = await queryDocument(trimmedQuery);

      const assistantMessage: Message = {
        id: nextId(),
        role: "assistant",
        content: response.answer,
        context: response.context,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: nextId(),
        role: "assistant",
        content: `Sorry, something went wrong: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsQuerying(false);
    }
  }, [ingestState, query]);

  /** Resets all state for a fresh session. */
  const handleClearChat = useCallback(() => {
    setMessages([]);
    setSelectedFile(null);
    setIngestState("idle");
    setTotalChunks(null);
    setIngestError(null);
    setQuery("");
    setQueryError(null);
  }, []);

  // ── Derived helpers ────────────────────────────────────────────────────────

  const isUploading = ingestState === "uploading";
  const isReady = ingestState === "ready";
  const chatDisabled = isQuerying || !isReady;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#FDFAF5] overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-80 flex-shrink-0 flex flex-col gap-4 p-5 border-b md:border-b-0 md:border-r border-[#E8DCC8] bg-white/70 backdrop-blur-sm overflow-y-auto">

        {/* Branding */}
        <div className="flex items-center gap-3 pt-1">
          <div className="w-9 h-9 rounded-xl bg-[#C17B2A] flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#2C2416] leading-tight">Query.AI</h1>
            <p className="text-[11px] text-[#8A7355]">RAG Document Assistant</p>
          </div>
        </div>

        <hr className="border-[#E8DCC8]" />

        {/* ── File upload section ──────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#5C4A1E] uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Step 1 — Upload Document
          </label>

          <FileUpload
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            disabled={isUploading || isReady}
          />

          {/* Upload button — only shown when a file is selected but not yet indexed */}
          {selectedFile && ingestState === "idle" && (
            <button
              onClick={handleIngest}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold bg-[#C17B2A] text-white hover:bg-[#A36320] active:scale-95 transition-all duration-150 shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Upload &amp; Index Document
            </button>
          )}
        </div>

        {/* ── Phase 1 loader ────────────────────────────────────────────── */}
        {isUploading && (
          <div className="flex flex-col gap-2.5 px-4 py-4 rounded-xl border border-[#E8DCC8] bg-white shadow-sm">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 text-[#C17B2A] animate-spin flex-shrink-0" />
              <span className="text-sm font-semibold text-[#2C2416]">Indexing document…</span>
            </div>
            {/* Indeterminate progress bar */}
            <div className="h-1.5 w-full rounded-full bg-[#F0E8D5] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#C17B2A] origin-left"
                style={{ animation: "progress-indeterminate 1.6s ease-in-out infinite" }}
              />
            </div>
            <div className="space-y-1 text-[11px] text-[#8A7355] leading-relaxed">
              <p>Parsing PDF text…</p>
              <p>Splitting into chunks…</p>
              <p>Generating embeddings (Gemini)…</p>
              <p>Storing in Qdrant vector DB…</p>
            </div>
          </div>
        )}

        {/* ── Phase 1 success banner ────────────────────────────────────── */}
        {isReady && (
          <div className="flex flex-col gap-1.5 px-4 py-3.5 rounded-xl border border-green-200 bg-green-50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-green-800">Document indexed!</span>
            </div>
            <button
              onClick={handleFileSelect.bind(null, null)}
              className="mt-1 text-[11px] text-green-700 underline underline-offset-2 hover:text-green-900 text-left transition-colors"
            >
              Upload a different document
            </button>
          </div>
        )}

        {/* Ingest error */}
        {ingestError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{ingestError}</p>
          </div>
        )}

        {/* Query error */}
        {queryError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{queryError}</p>
          </div>
        )}

        {/* How it works guide */}
        <div className="flex-1" />
        <div className="rounded-xl border border-[#E8DCC8] bg-[#FDFAF5] p-4 space-y-2.5">
          <p className="text-xs font-semibold text-[#5C4A1E] uppercase tracking-wide">How it works</p>
          {[
            ["1", "Select & upload a PDF"],
            ["2", "Wait for indexing to complete"],
            ["3", "Ask questions in the chat"],
          ].map(([num, text]) => (
            <div key={num} className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#C17B2A] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {num}
              </span>
              <span className="text-xs text-[#5C4A1E]">{text}</span>
            </div>
          ))}
        </div>

        {/* Clear session */}
        {(messages.length > 0 || isReady) && (
          <button
            onClick={handleClearChat}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium text-[#8A7355] border border-[#E8DCC8] hover:border-[#D94F3D] hover:text-[#D94F3D] hover:bg-red-50 transition-all duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            New session
          </button>
        )}
      </aside>

      {/* ── Chat panel ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0">

        {/* Header */}
        <div className="flex-shrink-0 px-5 py-3.5 border-b border-[#E8DCC8] bg-white/60 backdrop-blur-sm flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#2C2416]">
              {selectedFile ? selectedFile.name : "No document loaded"}
            </h2>
            <p className="text-[11px] text-[#8A7355]">
              {isReady
                ? `${totalChunks} chunks indexed · ${Math.ceil(messages.length / 2)} question${messages.length > 2 ? "s" : ""} asked`
                : "Upload a document to start chatting →"}
            </p>
          </div>
          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            {isUploading || isQuerying ? (
              <Loader2 className="w-3 h-3 text-[#C17B2A] animate-spin" />
            ) : isReady ? (
              <span className="w-2 h-2 rounded-full bg-green-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#E8DCC8]" />
            )}
            <span className="text-[11px] text-[#8A7355]">
              {isUploading ? "Indexing…" : isQuerying ? "Thinking…" : isReady ? "Ready" : "Idle"}
            </span>
          </div>
        </div>

        {/* Message feed */}
        <ChatInterface messages={messages} isLoading={isQuerying} />

        {/* Query input */}
        <div className="flex-shrink-0 p-4 border-t border-[#E8DCC8] bg-white/60 backdrop-blur-sm">
          <QueryInput
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            disabled={chatDisabled}
          />
          <p className="text-center text-[10px] text-[#C5AC82] mt-2">
            Powered by Gemini · Qdrant · RAG
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
