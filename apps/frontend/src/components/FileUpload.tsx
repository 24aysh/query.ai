import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  /** The currently selected file (controlled from parent). */
  selectedFile: File | null;
  /** Disable the control while a request is in-flight. */
  disabled?: boolean;
}
export function FileUpload({ onFileSelect, selectedFile, disabled }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Validate that the dropped/selected item is a PDF file. */
  const handleFile = useCallback(
    (file: File | null) => {
      if (file && file.type !== "application/pdf") {
        alert("Please upload a PDF file.");
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0] ?? null;
    handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
    // Reset so the same file can be re-selected after clearing
    e.target.value = "";
  };

  // ── Render: file already selected ─────────────────────────────────────
  if (selectedFile) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E8DCC8] bg-white shadow-sm">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#FFF3DC] flex items-center justify-center">
          <FileText className="w-5 h-5 text-[#C17B2A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#2C2416] truncate">{selectedFile.name}</p>
          <p className="text-xs text-[#8A7355]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
        </div>
        {!disabled && (
          <button
            onClick={() => onFileSelect(null)}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[#8A7355] hover:bg-[#F0E8D5] hover:text-[#D94F3D] transition-colors"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      aria-label="Upload PDF"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
      className={[
        "relative flex flex-col items-center justify-center gap-3",
        "px-6 py-8 rounded-xl border-2 border-dashed cursor-pointer",
        "transition-all duration-200 select-none",
        isDragOver
          ? "border-[#C17B2A] bg-[#FFF3DC] shadow-[0_0_0_3px_rgba(193,123,42,0.15)]"
          : "border-[#E8DCC8] bg-[#FDFAF5] hover:border-[#C17B2A] hover:bg-[#FFF3DC]",
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
        <Upload className={`w-6 h-6 transition-colors ${isDragOver ? "text-[#C17B2A]" : "text-[#8A7355]"}`} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-[#2C2416]">
          {isDragOver ? "Drop your PDF here" : "Drag & drop a PDF"}
        </p>
        <p className="text-xs text-[#8A7355] mt-0.5">or click to browse</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled}
        aria-hidden="true"
      />
    </div>
  );
}
