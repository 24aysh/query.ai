/**
 * ChatInterface.tsx
 *
 * Renders the message history as a scrollable chat feed.
 * Each message is displayed as a styled bubble:
 *  - User messages  → right-aligned, amber background
 *  - Assistant msgs → left-aligned, white card with subtle shadow
 *  - Typing state   → animated three-dot indicator
 *
 * The component auto-scrolls to the newest message on every update.
 */

import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";
import type { RetrievedChunk } from "../api/ragClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  /** Chunks retrieved from Qdrant, attached to assistant messages only. */
  context?: RetrievedChunk[];
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  /** When true, displays the animated typing indicator after the last message. */
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Three-dot animated typing indicator shown while the LLM is generating. */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 chat-bubble-enter">
      {/* Assistant avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FFF3DC] border border-[#E8DCC8] flex items-center justify-center">
        <Bot className="w-4 h-4 text-[#C17B2A]" />
      </div>
      {/* Dots */}
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-[#E8DCC8] shadow-sm">
        <div className="flex items-center gap-1.5 py-0.5">
          <span className="typing-dot w-2 h-2 rounded-full bg-[#C17B2A] opacity-70 inline-block" />
          <span className="typing-dot w-2 h-2 rounded-full bg-[#C17B2A] opacity-70 inline-block" />
          <span className="typing-dot w-2 h-2 rounded-full bg-[#C17B2A] opacity-70 inline-block" />
        </div>
      </div>
    </div>
  );
}

/** Renders context chunks that the LLM used to generate an answer. */
function ContextPanel({ chunks }: { chunks: RetrievedChunk[] }) {
  if (!chunks || chunks.length === 0) return null;
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-[#8A7355] hover:text-[#C17B2A] select-none transition-colors">
        View {chunks.length} source chunk{chunks.length !== 1 ? "s" : ""}
      </summary>
      <div className="mt-2 space-y-2">
        {chunks.map((chunk, i) => (
          <div
            key={i}
            className="px-3 py-2 rounded-lg bg-[#FDFAF5] border border-[#E8DCC8] text-[#5C4A1E] leading-relaxed"
          >
            <span className="font-semibold text-[#C17B2A]">
              Score: {(chunk.score * 100).toFixed(1)}%
            </span>
            <p className="mt-1 line-clamp-4">{chunk.text}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * ChatInterface — Scrollable feed of user and assistant messages.
 *
 * @param messages  - Ordered array of conversation messages.
 * @param isLoading - Whether to show the typing indicator.
 */
export function ChatInterface({ messages, isLoading }: ChatInterfaceProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  /** Auto-scroll to the bottom whenever messages or loading state changes. */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#FFF3DC] border border-[#E8DCC8] flex items-center justify-center shadow-sm">
          <Bot className="w-8 h-8 text-[#C17B2A]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#2C2416]">Ready to explore your document</h2>
          <p className="text-sm text-[#8A7355] mt-1 max-w-xs">
            Upload a PDF on the left, type your question, and I'll answer from the document.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex items-end gap-3 chat-bubble-enter ${
            msg.role === "user" ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {/* Avatar */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              msg.role === "user"
                ? "bg-[#C17B2A]"
                : "bg-[#FFF3DC] border border-[#E8DCC8]"
            }`}
          >
            {msg.role === "user" ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <Bot className="w-4 h-4 text-[#C17B2A]" />
            )}
          </div>

          {/* Bubble */}
          <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
            <div
              className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#C17B2A] text-white rounded-br-sm"
                  : "bg-white text-[#2C2416] border border-[#E8DCC8] shadow-sm rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
            {/* Context source panel (assistant only) */}
            {msg.role === "assistant" && msg.context && msg.context.length > 0 && (
              <div className="mt-1 max-w-full">
                <ContextPanel chunks={msg.context} />
              </div>
            )}
            {/* Timestamp */}
            <span className="text-[10px] text-[#8A7355] mt-1 px-1">
              {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      ))}

      {/* Typing indicator */}
      {isLoading && <TypingIndicator />}

      {/* Invisible anchor for auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
}
