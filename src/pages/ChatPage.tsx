import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CpuChipIcon,
  CheckIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/solid";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAuth } from "../context/AuthContext";
import "katex/dist/katex.min.css";
import { useChatReset } from "../context/ChatResetContext";
import ChatInput from "../components/ChatInput";
import ModelSelector from "../components/ModelSelector";

// Types

type Attachment = {
  name: string;
  type: string;
  size: number;
  mime_type?: string;
};

type CodeProps = {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
};

type Message = {
  role: "user" | "ai" | "system";
  content: string;
  model?: string | null;
  timestamp?: number;
  id: string;
  attachments?: Attachment[];
};

type UploadedFileMeta = {
  id: string;
  name: string;
  type: string;
  size: number;
  mime_type: string;
};

type WebSocketPayload =
  | { type: "content"; delta: string }
  | {
      type: "system";
      event: "chat_id" | "route" | "cost" | "warning";
      payload: string;
    }
  | { type: "error"; message: string };

type CopiedState = { [key: string]: boolean };

const PLACEHOLDERS = [
  "Ask me anything... I'm ready to help 🚀",
  "Need code? Documentation? Analysis? Just ask...",
  "Transform ideas into reality with AI assistance...",
  "Debug, create, analyze - all in one conversation...",
  "Your AI workspace for productivity and creativity...",
];

export default function ChatPage() {
  const { token, refreshProfile } = useAuth();
  const { chatId: routeChatId } = useParams();
  const navigate = useNavigate();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [model, setModel] = useState(() => {
    return sessionStorage.getItem("selectedModel") || "auto";
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [copiedStates, setCopiedStates] = useState<CopiedState>({});
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState<{
    [key: string]: boolean;
  }>({});

  const activeChatId = routeChatId || null;

  // Placeholder State
  const [placeholderText, setPlaceholderText] = useState(PLACEHOLDERS[0]);
  const [fadePlaceholder, setFadePlaceholder] = useState(true);

  // Refs
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabled = useRef(true);
  const currentStreamModel = useRef<string | null>(null);
  const { resetKey } = useChatReset();

  const internalChatIdRef = useRef<string | null>(activeChatId);
  const isStreamingRef = useRef(false);

  const API_BASE = import.meta.env.VITE_API_URL;

  // Sync Internal Ref when Route Changes
  useEffect(() => {
    internalChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    sessionStorage.setItem("selectedModel", model);
  }, [model]);

  // Auto-focus text box on typing
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.key.length === 1) {
        textareaRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Rotating Placeholder Effect
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setFadePlaceholder(false);
      setTimeout(() => {
        index = (index + 1) % PLACEHOLDERS.length;
        setPlaceholderText(PLACEHOLDERS[index]);
        setFadePlaceholder(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch History on Mount
  useEffect(() => {
    let isActive = true;

    async function loadHistory() {
      if (!activeChatId || !token) {
        if (isActive) setMessages([]);
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}/api/v1/chat/history/${activeChatId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.ok) {
          const histMessages = await res.json();
          const formattedMessages: Message[] = histMessages.map(
            (m: any, idx: number) => ({
              role: m.role,
              content: m.content,
              model: m.model,
              id: m.id || `hist-${idx}-${Date.now()}`,
              timestamp: new Date(m.created_at).getTime(),
              attachments: m.attachments || [],
            })
          );

          if (isActive) {
            setMessages(formattedMessages);
          }
        } else {
          if (isActive) navigate("/dashboard");
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }

    loadHistory();

    return () => {
      isActive = false;
    };
  }, [activeChatId, token, navigate]);

  // WebSocket Connection
  useEffect(() => {
    if (!token) return;
    let isCleanup = false;
    let reconnectTimer: number | undefined;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host =
      window.location.hostname === "localhost"
        ? "localhost:8000"
        : "api.multiaimodel.com";

    const connect = () => {
      const targetChatId = internalChatIdRef.current || activeChatId || "";

      const wsUrl = `${protocol}://${host}/api/v1/chat/ws?token=${token}&model=${model}${
        targetChatId ? `&chat_id=${targetChatId}` : ""
      }`;

      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        if (isCleanup) {
          socket?.close();
          return;
        }
      };

      socket.onclose = (event) => {
        if (isCleanup) return;

        setIsStreaming(false);
        setIsThinking(false);
        isStreamingRef.current = false;

        if (event.code === 1008) {
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content:
                "⚠️ Disconnected: Insufficient credits or authentication issue.",
              id: `sys-${Date.now()}`,
            },
          ]);
          return;
        }
        reconnectTimer = setTimeout(() => {
          if (!isCleanup) connect();
        }, 3000);
      };

      socket.onmessage = (event) => {
        if (isCleanup) return;

        try {
          const data: WebSocketPayload = JSON.parse(event.data);

          if (data.type === "system") {
            const { event: sysEvent, payload } = data;

            if (sysEvent === "chat_id") {
              const newId = payload;
              internalChatIdRef.current = newId;

              if (!activeChatId) {
                window.history.replaceState(
                  null,
                  "",
                  `/dashboard/chat/${newId}`
                );
              }
            } else if (sysEvent === "warning") {
              console.warn("System Warning:", payload);
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `⚠️ Warning: ${payload}`,
                  id: `warn-${Date.now()}`,
                },
              ]);
            } else if (sysEvent === "route") {
              currentStreamModel.current = payload;
            } else if (sysEvent === "cost") {
              refreshProfile();
              setIsStreaming(false);
              isStreamingRef.current = false;
              currentStreamModel.current = null;
            }
            return;
          }

          if (data.type === "error") {
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `⚠️ Error: ${data.message}`,
                id: `err-${Date.now()}`,
              },
            ]);
            setIsStreaming(false);
            setIsThinking(false);
            isStreamingRef.current = false;
            return;
          }

          if (data.type === "content") {
            const textChunk = data.delta;

            setIsThinking(false);

            setIsStreaming(true);
            const wasStreaming = isStreamingRef.current;
            isStreamingRef.current = true;

            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === "ai" && wasStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, content: lastMsg.content + textChunk },
                ];
              } else {
                return [
                  ...prev,
                  {
                    role: "ai",
                    content: textChunk,
                    model: currentStreamModel.current,
                    id: `ai-${Date.now()}`,
                  },
                ];
              }
            });
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", event.data);
        }
      };
    };

    connect();
    return () => {
      isCleanup = true;
      clearTimeout(reconnectTimer);
      if (ws.current) ws.current.close();
    };
  }, [token, model, activeChatId]);

  // Scroll Logic
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
  }, []);

  useEffect(() => {
    if (isAutoScrollEnabled.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    isAutoScrollEnabled.current = isAtBottom;
    setShowScrollButton(!isAtBottom);
  };

  const sendMessage = async () => {
    if (
      (!input.trim() && selectedFiles.length === 0) ||
      !ws.current ||
      isStreaming ||
      isThinking
    )
      return;

    // Optimistic UI Update with attachment metadata
    const attachmentMeta: Attachment[] = selectedFiles.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));

    console.log(
      "Sending message:",
      input,
      selectedFiles.length > 0
        ? `[Attachments: ${selectedFiles.map((f) => f.name).join(", ")}]`
        : ""
    );

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: input,
        attachments: attachmentMeta,
        id: `user-${Date.now()}`,
      },
    ]);

    // Set Thinking / Loading State
    setThinkingMessage(
      selectedFiles.length > 0 ? "Uploading and analyzing..." : "Thinking..."
    );
    setIsThinking(true);

    // Handle File Uploads
    let processedAttachments: UploadedFileMeta[] = [];
    if (selectedFiles.length > 0) {
      try {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });

        const res = await fetch(`${API_BASE}/api/v1/chat/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Upload failed");
        }

        const data = await res.json();
        processedAttachments = data.files.filter((f: any) => f.id);

        // Check for failed
        const failedFiles = data.files.filter((f: any) => !f.id);
        if (failedFiles.length > 0) {
          console.error("Some files failed to upload:", failedFiles);
        }
      } catch (error) {
        console.error("File upload error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: "⚠️ Failed to upload attachments. Please try again.",
            id: `sys-${Date.now()}`,
          },
        ]);
        setIsThinking(false);
        return;
      }
    }

    // Send WebSocket Payload
    const payload = JSON.stringify({
      type: "user_message",
      content: input,
      attachments: processedAttachments,
    });

    ws.current.send(payload);

    // Cleanup
    setInput("");
    setSelectedFiles([]);

    isAutoScrollEnabled.current = true;
    setTimeout(scrollToBottom, 10);
  };

  // Handle New Chat Reset
  useEffect(() => {
    setMessages([]);
    setIsStreaming(false);
    setIsThinking(false);
    isStreamingRef.current = false;
    currentStreamModel.current = null;
    internalChatIdRef.current = null;

    ws.current?.close();
    ws.current = null;
  }, [resetKey]);

  const handleStop = () => {
    if (ws.current && (isStreaming || isThinking)) {
      setIsStreaming(false);
      setIsThinking(false);
      isStreamingRef.current = false;
      ws.current.close();
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [id]: true }));
      setTimeout(
        () => setCopiedStates((prev) => ({ ...prev, [id]: false })),
        2000
      );
    } catch (err) {
      console.error("Failed copy", err);
    }
  };

  const toggleCodeBlock = (id: string) => {
    setExpandedCodeBlocks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // File Icon & Color Helper
  const getFileInfo = (type: string, name: string) => {
    const lowerName = name.toLowerCase();

    if (
      type.startsWith("image/") ||
      lowerName.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i)
    ) {
      return {
        icon: "🖼️",
        color: "from-pink-500/20 to-rose-500/20",
        border: "border-pink-400/40",
        text: "text-pink-200",
      };
    }
    if (
      type.startsWith("video/") ||
      lowerName.match(/\.(mp4|avi|mov|mkv|webm)$/i)
    ) {
      return {
        icon: "🎥",
        color: "from-purple-500/20 to-violet-500/20",
        border: "border-purple-400/40",
        text: "text-purple-200",
      };
    }
    if (
      type.startsWith("audio/") ||
      lowerName.match(/\.(mp3|wav|ogg|flac|m4a)$/i)
    ) {
      return {
        icon: "🎵",
        color: "from-cyan-500/20 to-blue-500/20",
        border: "border-cyan-400/40",
        text: "text-cyan-200",
      };
    }
    if (type === "application/pdf" || lowerName.endsWith(".pdf")) {
      return {
        icon: "📄",
        color: "from-red-500/20 to-orange-500/20",
        border: "border-red-400/40",
        text: "text-red-200",
      };
    }
    if (
      type.includes("document") ||
      lowerName.match(/\.(doc|docx|txt|rtf)$/i)
    ) {
      return {
        icon: "📝",
        color: "from-blue-500/20 to-indigo-500/20",
        border: "border-blue-400/40",
        text: "text-blue-200",
      };
    }
    if (type.includes("spreadsheet") || lowerName.match(/\.(xls|xlsx|csv)$/i)) {
      return {
        icon: "📊",
        color: "from-green-500/20 to-emerald-500/20",
        border: "border-green-400/40",
        text: "text-green-200",
      };
    }
    if (type.includes("presentation") || lowerName.match(/\.(ppt|pptx)$/i)) {
      return {
        icon: "📊",
        color: "from-orange-500/20 to-amber-500/20",
        border: "border-orange-400/40",
        text: "text-orange-200",
      };
    }
    if (
      type.includes("zip") ||
      type.includes("compressed") ||
      lowerName.match(/\.(zip|rar|7z|tar|gz)$/i)
    ) {
      return {
        icon: "📦",
        color: "from-yellow-500/20 to-amber-500/20",
        border: "border-yellow-400/40",
        text: "text-yellow-200",
      };
    }
    if (
      lowerName.match(/\.(js|jsx|ts|tsx|py|java|cpp|c|html|css|json|xml)$/i)
    ) {
      return {
        icon: "💻",
        color: "from-slate-500/20 to-gray-500/20",
        border: "border-slate-400/40",
        text: "text-slate-200",
      };
    }

    return {
      icon: "📎",
      color: "from-gray-500/20 to-slate-500/20",
      border: "border-gray-400/40",
      text: "text-gray-200",
    };
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Enhanced Markdown Components
  const sharedComponents: Partial<Components> = {
    p: ({ children }) => (
      <p className="mb-4 last:mb-0 leading-[1.75] text-gray-100 text-sm sm:text-[15px]">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-outside ml-5 sm:ml-6 mb-4 space-y-2 text-gray-100 text-sm sm:text-[15px]">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-outside ml-5 sm:ml-6 mb-4 space-y-2 text-gray-100 text-sm sm:text-[15px]">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-[1.75] pl-1">{children}</li>,
    h1: ({ children }) => (
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5 mt-6 sm:mt-7 text-white border-b border-gray-700/50 pb-2 sm:pb-3">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 mt-5 sm:mt-6 text-white">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 mt-4 sm:mt-5 text-gray-100">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base sm:text-lg font-semibold mb-2 mt-3 sm:mt-4 text-gray-200">
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500/80 bg-blue-500/5 pl-4 sm:pl-5 pr-3 sm:pr-4 py-2 sm:py-3 italic my-4 sm:my-5 text-gray-200 rounded-r-lg text-sm sm:text-base">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-4 sm:my-6 rounded-lg border border-gray-700/50">
        <table className="min-w-full divide-y divide-gray-700/50">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-800/50">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-gray-700/30 bg-gray-900/20">
        {children}
      </tbody>
    ),
    th: ({ children }) => (
      <th className="px-3 sm:px-5 py-2 sm:py-3.5 text-left text-xs sm:text-sm font-semibold text-gray-200 uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 sm:px-5 py-2 sm:py-3.5 text-xs sm:text-sm text-gray-300 leading-relaxed">
        {children}
      </td>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
      >
        {children}
      </a>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-white">{children}</strong>
    ),
    em: ({ children }) => <em className="italic text-gray-200">{children}</em>,
    hr: () => <hr className="my-4 sm:my-6 border-gray-700/50" />,
    code: (props: CodeProps) => {
      const { node, className, children, inline = false, ...rest } = props;
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";
      const codeString = String(children).replace(/\n$/, "");
      const codeId = `code-${node?.position?.start.offset || Math.random()}`;
      const isExpanded = expandedCodeBlocks[codeId];
      const lineCount = codeString.split("\n").length;
      const shouldTruncate = lineCount > 20;

      return !inline && match ? (
        <div className="my-4 sm:my-6 rounded-xl overflow-hidden bg-[#1e1e1e] border border-gray-700/40 shadow-2xl">
          <div className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 bg-[#2d2d2d]/80 border-b border-gray-700/40 backdrop-blur-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/90 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/90 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-green-500/90 shadow-sm" />
              </div>
              <span className="text-[10px] sm:text-xs text-gray-400 font-mono font-semibold uppercase tracking-wide">
                {language || "plaintext"}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 font-mono">
                {lineCount} {lineCount === 1 ? "line" : "lines"}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {shouldTruncate && (
                <button
                  onClick={() => toggleCodeBlock(codeId)}
                  className="text-[10px] sm:text-xs text-gray-400 hover:text-blue-400 flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded hover:bg-gray-700/30 transition-all"
                >
                  <span className="hidden sm:inline">
                    {isExpanded ? "Collapse" : "Expand"}
                  </span>
                  <ChevronDownIcon
                    className={`w-3 sm:w-3.5 h-3 sm:h-3.5 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
              <button
                onClick={() => handleCopy(codeString, codeId)}
                className="text-gray-400 hover:text-emerald-400 p-1 sm:p-1.5 rounded hover:bg-gray-700/30 transition-all"
                title="Copy code"
              >
                {copiedStates[codeId] ? (
                  <CheckIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-400" />
                ) : (
                  <ClipboardDocumentIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                )}
              </button>
            </div>
          </div>
          <div
            className={`relative overflow-hidden transition-all duration-300 ${
              shouldTruncate && !isExpanded
                ? "max-h-[400px] sm:max-h-[500px]"
                : "max-h-none"
            }`}
          >
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: "1rem",
                background: "#1e1e1e",
                fontSize: "0.8rem",
                lineHeight: "1.6",
              }}
              showLineNumbers={lineCount > 5}
              wrapLines={true}
              {...rest}
            >
              {codeString}
            </SyntaxHighlighter>
            {shouldTruncate && !isExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-24 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/80 to-transparent pointer-events-none" />
            )}
          </div>
        </div>
      ) : (
        <code
          className="bg-gray-800/60 text-blue-300 rounded-md px-1.5 sm:px-2 py-0.5 text-[0.85em] sm:text-[0.9em] font-mono border border-gray-700/40"
          {...rest}
        >
          {children}
        </code>
      );
    },
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#0a0b0f] via-[#0d0e14] to-[#0a0b0f] relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3 sm:px-3 md:px-5 py-2.5 sm:py-3.5 flex items-center justify-end bg-transparent border-none shadow-none pointer-events-none">
        <div className="pointer-events-auto">
          <ModelSelector model={model} setModel={setModel} />
        </div>
      </div>

      {/* Chat Content */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pt-16 sm:pt-20 pb-4 px-3 sm:px-4 md:px-6 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
      >
        <div
          className={`mx-auto space-y-4 sm:space-y-5 transition-all duration-300 max-w-5xl`}
        >
          {messages.length === 0 && (
            <div className="h-[60vh] sm:h-[65vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-1000 px-4">
              <div className="relative mb-8 sm:mb-10">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl sm:rounded-3xl blur-2xl sm:blur-3xl opacity-20 animate-pulse" />
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl rotate-6 hover:rotate-0 transition-transform duration-500">
                  <svg
                    className="w-10 h-10 sm:w-12 sm:h-12 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2 sm:mb-3">
                Ready to Assist
              </h2>
              <p className="text-gray-400 text-base sm:text-lg max-w-md px-4">
                Ask questions, write code, analyze data, or explore ideas
                together
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } animate-in slide-in-from-bottom-2 duration-400`}
            >
              <div
                className={`relative group ${
                  msg.role === "user"
                    ? "max-w-[90%] sm:max-w-[85%]"
                    : msg.role === "system"
                    ? "w-full max-w-3xl"
                    : "max-w-[95%] sm:max-w-[92%]"
                } rounded-2xl transition-all ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/20 px-4 sm:px-5 py-3 sm:py-4 rounded-br-sm"
                    : msg.role === "system"
                    ? "bg-amber-500/5 border border-amber-500/20 text-amber-300/90 text-xs sm:text-sm font-mono py-2 sm:py-3 px-4 sm:px-5 text-center rounded-xl mx-auto"
                    : "bg-[#13151c] border border-gray-700/30 text-gray-100 shadow-2xl px-4 sm:px-6 py-4 sm:py-5 rounded-bl-sm"
                }`}
              >
                {msg.role === "ai" ? (
                  <div className="flex flex-col gap-3">
                    <div className="prose prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-400">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={sharedComponents}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Model Badge */}
                    {msg.model && (
                      <div className="flex items-center gap-2 mt-1 pt-3 border-t border-gray-700/40">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20">
                          <CpuChipIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-purple-400" />
                          <span className="text-[10px] sm:text-[11px] font-semibold text-purple-300 uppercase tracking-wide">
                            {msg.model}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : msg.role === "system" ? (
                  <div className="leading-[1.7] break-words whitespace-pre-wrap text-sm sm:text-[15px]">
                    {msg.content}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {msg.content && (
                      <div className="leading-[1.7] break-words whitespace-pre-wrap text-sm sm:text-[15px]">
                        {msg.content}
                      </div>
                    )}

                    {/* Enhanced Attachment Pills */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-blue-200/70 font-medium">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>
                            {msg.attachments.length}{" "}
                            {msg.attachments.length === 1
                              ? "Attachment"
                              : "Attachments"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.attachments.map((file, idx) => {
                            const fileInfo = getFileInfo(file.type, file.name);

                            return (
                              <div
                                key={idx}
                                className={`group/file relative flex items-center gap-2 bg-gradient-to-br ${fileInfo.color} backdrop-blur-sm border ${fileInfo.border} rounded-lg px-3 py-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}
                              >
                                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white/10 backdrop-blur-sm">
                                  <span className="text-lg">
                                    {fileInfo.icon}
                                  </span>
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span
                                    className={`text-xs font-semibold ${fileInfo.text} truncate max-w-[180px] sm:max-w-[280px]`}
                                  >
                                    {file.name}
                                  </span>
                                  <span className="text-[10px] text-blue-300/60 font-medium">
                                    {formatSize(file.size)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Copy Button for AI Messages */}
                {msg.role === "ai" && (
                  <button
                    onClick={() => handleCopy(msg.content, `msg-${msg.id}`)}
                    className="absolute -bottom-2 -right-2 p-2 sm:p-2.5 bg-[#2d3139] hover:bg-[#363c47] border border-gray-700/50 rounded-xl shadow-xl transition-all opacity-0 group-hover:opacity-100 hover:scale-105"
                    title="Copy message"
                  >
                    {copiedStates[`msg-${msg.id}`] ? (
                      <CheckIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-400" />
                    ) : (
                      <DocumentDuplicateIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400" />
                    )}
                  </button>
                )}

                {/* Copy Button for User Messages */}
                {msg.role === "user" && (
                  <button
                    onClick={() => handleCopy(msg.content, `msg-${msg.id}`)}
                    className="absolute -bottom-2 -left-2 p-2 sm:p-2.5 bg-blue-800/80 hover:bg-blue-700/80 border border-blue-600/30 rounded-xl shadow-xl transition-all opacity-0 group-hover:opacity-100 hover:scale-105"
                    title="Copy message"
                  >
                    {copiedStates[`msg-${msg.id}`] ? (
                      <CheckIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-white" />
                    ) : (
                      <DocumentDuplicateIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-white" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Thinking State */}
          {isThinking && (
            <div className="flex items-start gap-3 sm:gap-4 animate-in fade-in pl-2 sm:pl-3">
              <div className="relative mt-1">
                {/* Animated Circle */}
                <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 opacity-20 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                  <div className="absolute inset-2 rounded-full bg-[#0d0e14] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="flex-1 mt-0.5 sm:mt-1">
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-xl border border-blue-500/20">
                  <span className="text-xs sm:text-sm text-blue-300 font-medium animate-pulse">
                    {thinkingMessage}
                  </span>
                  <span className="flex gap-1">
                    <span
                      className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-purple-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-pink-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 text-white rounded-full p-2.5 sm:p-3.5 shadow-2xl z-30 hover:scale-110 transition-transform"
          aria-label="Scroll to bottom"
        >
          <ChevronDownIcon className="w-4 sm:w-5 h-4 sm:h-5" />
        </button>
      )}

      <ChatInput
        input={input}
        setInput={setInput}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        isStreaming={isStreaming}
        isThinking={isThinking}
        onSend={sendMessage}
        onStop={handleStop}
        textareaRef={textareaRef}
        isFullWidth={false}
        showEmptyStatePlaceholder={messages.length === 0}
        placeholderText={placeholderText}
        fadePlaceholder={fadePlaceholder}
      />
    </div>
  );
}
