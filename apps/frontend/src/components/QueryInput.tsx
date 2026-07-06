import { useRef, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface QueryInputProps {
  /** Current text value (controlled). */
  value: string;
  /** Called whenever the textarea value changes. */
  onChange: (value: string) => void;
  /** Called when the user submits the query. */
  onSubmit: () => void;
  /** Disables the input while a response is loading. */
  disabled?: boolean;
}

export function QueryInput({ value, onChange, onSubmit, disabled }: QueryInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Intercept Enter to trigger submit instead of newline. */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  /** Auto-resize the textarea height to fit content. */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  };

  const canSubmit = !disabled && value.trim().length > 0;

  return (
    <div className="flex items-end gap-2 p-3 rounded-2xl border border-[#E8DCC8] bg-white shadow-sm focus-within:border-[#C17B2A] focus-within:shadow-[0_0_0_3px_rgba(193,123,42,0.12)] transition-all duration-200">
      <textarea
        ref={textareaRef}
        id="query-input"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="Hi, How can I help you"
        aria-label="Your question"
        className={[
          "flex-1 resize-none bg-transparent text-sm text-[#2C2416] placeholder:text-[#8A7355]",
          "outline-none leading-relaxed py-1 px-1 max-h-[120px] overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-[#E8DCC8]",
          disabled ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
      />
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        aria-label="Send question"
        className={[
          "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
          "transition-all duration-200",
          canSubmit
            ? "bg-[#C17B2A] text-white hover:bg-[#A36320] shadow-sm hover:shadow-md active:scale-95"
            : "bg-[#F0E8D5] text-[#C5AC82] cursor-not-allowed",
        ].join(" ")}
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
