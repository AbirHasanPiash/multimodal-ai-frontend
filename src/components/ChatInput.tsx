import React, { useEffect, useRef, type KeyboardEvent } from "react";
import { 
  PaperAirplaneIcon, 
  StopIcon, 
  PaperClipIcon, 
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";

type ChatInputProps = {
  input: string;
  setInput: (value: string) => void;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  isStreaming: boolean;
  isThinking: boolean;
  onSend: () => void;
  onStop: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isFullWidth: boolean;
  showEmptyStatePlaceholder: boolean;
  placeholderText: string;
  fadePlaceholder: boolean;
};

export default function ChatInput({
  input,
  setInput,
  selectedFiles,
  setSelectedFiles,
  isStreaming,
  isThinking,
  onSend,
  onStop,
  textareaRef,
  isFullWidth,
  showEmptyStatePlaceholder,
  placeholderText,
  fadePlaceholder,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
      
      // Show scrollbar only when content exceeds max height
      if (textareaRef.current.scrollHeight > 200) {
        textareaRef.current.style.overflowY = "auto";
      } else {
        textareaRef.current.style.overflowY = "hidden";
      }
    }
  }, [input, textareaRef]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || selectedFiles.length > 0) {
        onSend();
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles([...selectedFiles, ...newFiles]);
    }
    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
  };

  const renderFilePreview = (file: File, index: number) => {
    const isImage = file.type.startsWith("image/");
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);

    return (
      <div
        key={index}
        className="flex items-center gap-2.5 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 border-b border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <div className="relative group shrink-0">
          {isImage ? (
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden border border-white/10 shadow-lg shadow-black/20 ring-1 ring-white/5">
              <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                className="w-full h-full object-cover"
                onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
              />
            </div>
          ) : (
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-white/10 shadow-lg shadow-black/20">
              <DocumentIcon className="w-5 h-5 text-blue-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-200 font-medium truncate">
            {file.name}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500 font-mono mt-0.5">
            {sizeInMB} MB
          </p>
        </div>

        <button
          onClick={() => removeFile(index)}
          className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-rose-400 transition-all duration-200 active:scale-95"
          title="Remove attachment"
        >
          <XMarkIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>
      </div>
    );
  };

  const canSend = (input.trim() || selectedFiles.length > 0) && !isStreaming && !isThinking;

  return (
    <div className="relative px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 bg-gradient-to-b from-[#0a0b0f] via-[#0d0e14] to-[#0a0b0f]">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-blue-500/[0.02] pointer-events-none" />

      <div
        className={`relative mx-auto transition-all duration-500 ease-out ${
          isFullWidth ? "max-w-full" : "max-w-3xl"
        }`}
      >
        {/* Main Input Container */}
        <div className="group relative">
          {/* Glow effect on focus - positioned behind */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-blue-500/0 group-focus-within:from-blue-500/20 group-focus-within:via-purple-500/20 group-focus-within:to-blue-500/20 rounded-2xl blur-sm transition-all duration-500" />

          <div className="relative bg-gradient-to-br from-[#1a1d26] to-[#151820] rounded-2xl border border-white/[0.08] shadow-2xl transition-all duration-300 overflow-hidden backdrop-blur-xl">
            
            {/* Multiple Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="relative max-h-[200px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                {/* Header with file count and clear all */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border-b border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <PhotoIcon className="w-4 h-4 text-blue-400" />
                    <span className="text-xs sm:text-sm text-gray-300 font-medium">
                      {selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"} attached
                    </span>
                  </div>
                  <button
                    onClick={clearAllFiles}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 hover:bg-rose-500/10 rounded transition-all"
                  >
                    Clear All
                  </button>
                </div>

                {/* Files List */}
                {selectedFiles.map((file, index) => renderFilePreview(file, index))}
              </div>
            )}

            {/* Input Area */}
            <div className="relative">
              <textarea
                ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                placeholder=""
                rows={1}
                className="w-full bg-transparent text-white text-sm sm:text-[15px] leading-relaxed 
                outline-none outline-0 border-none ring-0 focus:outline-none focus:outline-0 focus:border-none focus:ring-0
                pl-10 sm:pl-11 pr-11 sm:pr-12 py-3 sm:py-3.5 resize-none disabled:opacity-50 
                disabled:cursor-not-allowed placeholder:text-transparent 
                [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent 
                [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full 
                [&::-webkit-scrollbar-thumb]:hover:bg-white/20"
                style={{ 
                  maxHeight: "200px", 
                  outline: "none", 
                  border: "none", 
                  boxShadow: "none",
                  overflowY: "hidden"
                }}
              />

              {/* Dynamic Placeholder */}
              {!input && !isStreaming && showEmptyStatePlaceholder && selectedFiles.length === 0 && (
                <div
                  className={`absolute left-10 sm:left-11 top-3 sm:top-3.5 text-gray-500 text-sm sm:text-base pointer-events-none transition-all duration-300 ${
                    fadePlaceholder ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                  }`}
                >
                  {placeholderText}
                </div>
              )}

              {isStreaming && !input && (
                <div className="absolute left-10 sm:left-11 top-3 sm:top-3.5 text-gray-600 text-sm sm:text-base pointer-events-none flex items-center gap-2">
                  <span className="inline-block animate-pulse">⏳</span>
                  <span>Waiting for response...</span>
                </div>
              )}

              {/* Attachment Button */}
              <div className="absolute left-2 sm:left-2.5 bottom-2 sm:bottom-3.5 z-10">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isStreaming || isThinking}
                  className={`p-1.5 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 group/attach ${
                    selectedFiles.length > 0
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-gray-400 hover:text-blue-400 hover:bg-blue-500/10"
                  }`}
                  title="Attach files"
                >
                  <PaperClipIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover/attach:rotate-12 transition-transform duration-200" />
                </button>
              </div>

              {/* Send/Stop Button */}
              <div className="absolute right-2 sm:right-2.5 bottom-2 sm:bottom-2.5 z-10">
                {isStreaming || isThinking ? (
                  <button
                    onClick={onStop}
                    className="relative p-2 sm:p-2.5 bg-gradient-to-br from-rose-500/20 to-rose-600/20 text-rose-400 rounded-lg hover:from-rose-500/30 hover:to-rose-600/30 transition-all duration-200 shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20 active:scale-95 border border-rose-500/20"
                    title="Stop generation"
                  >
                    <StopIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    <span className="absolute inset-0 rounded-lg bg-rose-400/20 animate-ping opacity-20" />
                  </button>
                ) : (
                  <button
                    onClick={onSend}
                    disabled={!canSend}
                    className="relative overflow-hidden p-2 sm:p-2.5 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 hover:from-blue-400 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 disabled:shadow-none active:scale-95 hover:scale-[1.02] group/send border border-white/10"
                    title="Send message"
                  >
                    <PaperAirplaneIcon className="relative z-10 w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5 transition-transform duration-200" />
                    {canSend && (
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/send:translate-x-full transition-transform duration-700" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="flex items-center justify-center gap-2 mt-2.5 sm:mt-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent max-w-xs" />
          <p className="text-[10px] sm:text-[11px] text-gray-500/80 font-medium tracking-wide px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/[0.02] border border-white/[0.03]">
            <span className="text-amber-500/70">⚠</span> AI may produce inaccurate information
          </p>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent max-w-xs" />
        </div>
      </div>
    </div>
  );
}