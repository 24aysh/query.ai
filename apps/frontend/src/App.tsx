/**
 * App.tsx
 *
 * Root component for Query.AI — a RAG-powered document chatbot.
 *
 * Layout (desktop, ≥768 px):
 * ┌─────────────────────┬────────────────────────────────────┐
 * │  Sidebar            │  Chat panel                        │
 * │  - Branding         │  - Message feed (ChatInterface)    │
 * │  - File upload      │  - Query input bar (QueryInput)    │
 * │  - Status / info    │                                    │
 * └─────────────────────┴────────────────────────────────────┘
 *
 * On mobile (<768 px) the sidebar stacks above the chat panel.
 *
 * State machine:
 *   idle         → user has not yet uploaded anything
 *   uploading    → request in-flight to POST /uploads
 *   ready        → at least one exchange has completed
 *
 * The component wires FileUpload, QueryInput, and ChatInterface together
 * and handles all API calls via ragClient.
 */

import { useState, useCallback, useId } from "react";
import { FileText, Sparkles, Trash2, AlertCircle } from "lucide-react";
import { FileUpload } from "./components/FileUpload";
import { ChatInterface, type Message } from "./components/ChatInterface";
import { QueryInput } from "./components/QueryInput";
import { uploadAndQuery } from "./api/ragClient";
import "./index.css";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  // ── State ────────────────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const genId = useId();
  let msgCounter = 0;
  const nextId = () => `${genId}-${++msgCounter}`;

  // ── Handlers ─────────────────────────────────────────────────────────────

  /** Clears the entire conversation history and resets file selection. */
  const handleClearChat = useCallback(() => {
    setMessages([]);
    setSelectedFile(null);
    setQuery("");
    setError(null);
  }, []);

  /**
   * Main submission handler.
   * Validates inputs, appends the user message, calls the backend,
   * then appends the assistant response (or an error message).
   */
  const handleSubmit = useCallback(async () => {
    const trimmedQuery = query.trim();

    if (!selectedFile) {
      setError("Please upload a PDF before asking a question.");
      return;
    }
    if (!trimmedQuery) {
      setError("Please type a question.");
      return;
    }

    setError(null);
    setIsLoading(true);

    // Append user message immediately for responsive feel
    const userMessage: Message = {
      id: nextId(),
      role: "user",
      content: trimmedQuery,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");

    try {
      const response = await uploadAndQuery(selectedFile, trimmedQuery);

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
      setIsLoading(false);
    }
  }, [selectedFile, query]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#FDFAF5] overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-80 flex-shrink-0 flex flex-col gap-5 p-5 border-b md:border-b-0 md:border-r border-[#E8DCC8] bg-white/70 backdrop-blur-sm overflow-y-auto">

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

        {/* File Upload Section */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#5C4A1E] uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Document
          </label>
          <FileUpload
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
            disabled={isLoading}
          />
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        )}

        {/* How-to guide */}
        <div className="flex-1" />
        <div className="rounded-xl border border-[#E8DCC8] bg-[#FDFAF5] p-4 space-y-2.5">
          <p className="text-xs font-semibold text-[#5C4A1E] uppercase tracking-wide">How it works</p>
          {[
            ["1", "Upload a PDF document"],
            ["2", "Type your question below"],
            ["3", "Get an AI answer from the doc"],
          ].map(([num, text]) => (
            <div key={num} className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#C17B2A] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {num}
              </span>
              <span className="text-xs text-[#5C4A1E]">{text}</span>
            </div>
          ))}
        </div>

        {/* Clear chat button */}
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium text-[#8A7355] border border-[#E8DCC8] hover:border-[#D94F3D] hover:text-[#D94F3D] hover:bg-red-50 transition-all duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear conversation
          </button>
        )}
      </aside>

      {/* ── Chat Panel ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0">

        {/* Chat header */}
        <div className="flex-shrink-0 px-5 py-3.5 border-b border-[#E8DCC8] bg-white/60 backdrop-blur-sm flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#2C2416]">
              {selectedFile ? selectedFile.name : "No document loaded"}
            </h2>
            <p className="text-[11px] text-[#8A7355]">
              {messages.length > 0
                ? `${Math.ceil(messages.length / 2)} exchange${messages.length > 2 ? "s" : ""}`
                : "Start by uploading a document →"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isLoading ? "bg-[#C17B2A] animate-pulse" : "bg-green-400"}`} />
            <span className="text-[11px] text-[#8A7355]">{isLoading ? "Thinking…" : "Ready"}</span>
          </div>
        </div>

        {/* Message feed */}
        <ChatInterface messages={messages} isLoading={isLoading} />

        {/* Query input */}
        <div className="flex-shrink-0 p-4 border-t border-[#E8DCC8] bg-white/60 backdrop-blur-sm">
          <QueryInput
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            disabled={isLoading}
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
