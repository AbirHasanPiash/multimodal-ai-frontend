import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  PaperAirplaneIcon,
  CpuChipIcon,
  StopIcon,
  CheckIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  Squares2X2Icon,
  ArrowsPointingOutIcon,
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

// Types
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

const THINKING_PHRASES = [
  "Analyzing your request",
  "Connecting neural pathways",
  "Consulting knowledge base",
  "Formulating response",
  "Processing patterns",
  "Synthesizing insights",
];

export default function ChatPage() {
  const { token, refreshProfile } = useAuth();
  const { chatId: routeChatId } = useParams();
  const navigate = useNavigate();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
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
  const [isFullWidth, setIsFullWidth] = useState(false);

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
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : 'multimodal-ai-z9yy.onrender.com';

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
                window.history.replaceState(null, "", `/dashboard/chat/${newId}`);
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

  // Input Handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !ws.current || isStreaming || isThinking)
      return;
    console.log("Sending message:", input);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input, id: `user-${Date.now()}` },
    ]);

    const randomPhrase = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
    setThinkingMessage(randomPhrase);
    setIsThinking(true);

    const payload = JSON.stringify({
      type: "user_message",
      content: input,
    });

    ws.current.send(payload);

    setInput("");
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

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
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 mt-5 sm:mt-6 text-white">{children}</h2>
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
                  <span className="hidden sm:inline">{isExpanded ? "Collapse" : "Expand"}</span>
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
              shouldTruncate && !isExpanded ? "max-h-[400px] sm:max-h-[500px]" : "max-h-none"
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
      <div className="absolute top-0 left-0 right-0 z-20 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3.5 flex items-center justify-between bg-[#0d0e14]/98 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl">
        <div className="flex items-center gap-2 sm:gap-3">
          
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setIsFullWidth(!isFullWidth)}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
              title={isFullWidth ? "Standard width" : "Full width"}
            >
              {isFullWidth ? (
                <Squares2X2Icon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              ) : (
                <ArrowsPointingOutIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Model Selector */}
        <div className="relative group min-w-[140px] sm:min-w-[180px]">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full appearance-none bg-[#1a1d26] hover:bg-[#1f2229] text-gray-200 text-[11px] sm:text-sm font-semibold rounded-lg sm:rounded-xl border border-gray-700/50 hover:border-blue-500/50 transition-all pl-3 sm:pl-4 pr-8 sm:pr-10 py-2 sm:py-2.5 focus:ring-2 focus:ring-blue-500/30 outline-none cursor-pointer shadow-lg"
          >
            <optgroup label="🎯 Recommended">
              <option value="auto">✨ Auto-Select</option>
            </optgroup>
            <optgroup label="🧠 Intelligence">
              <option value="gpt-5.2-pro">GPT-5.2 Pro</option>
              <option value="claude-4.5-opus">Claude 4.5 Opus</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            </optgroup>
            <optgroup label="⚡ Standard">
              <option value="gpt-5.2">GPT-5.2</option>
              <option value="gemini-3-pro-preview">
                Gemini 3 Pro
              </option>
              <option value="claude-4.5-sonnet">Claude 4.5 Sonnet</option>
            </optgroup>
            <optgroup label="🚀 Speed">
              <option value="gemini-3-flash-preview">
                Gemini 3 Flash
              </option>
              <option value="gpt-5-mini">GPT-5 Mini</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="claude-4.5-haiku">Claude 4.5 Haiku</option>
            </optgroup>
          </select>
          <CpuChipIcon className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-3 sm:w-4 h-3 sm:h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Chat Content */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pt-16 sm:pt-20 pb-4 px-3 sm:px-4 md:px-6 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
      >
        <div
          className={`mx-auto space-y-4 sm:space-y-5 transition-all duration-300 ${
            isFullWidth ? "max-w-full" : "max-w-5xl"
          }`}
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
                ) : (
                  <div className="leading-[1.7] break-words whitespace-pre-wrap text-sm sm:text-[15px]">
                    {msg.content}
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

          {/* Modern Thinking State */}
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
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Streaming State */}
          {isStreaming && (
            <div className="flex items-center gap-2 sm:gap-3 animate-in fade-in pl-2">
              <span className="flex gap-1.5 sm:gap-2">
                <span
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-pink-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
              <span className="text-xs sm:text-sm text-gray-400 font-medium">
                Generating response...
              </span>
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

      {/* Input Area */}
      <div className="p-3 sm:p-4 md:p-6 bg-[#0d0e14]/98 backdrop-blur-xl shadow-2x">
        <div
          className={`mx-auto relative group transition-all duration-300 ${
            isFullWidth ? "max-w-full" : "max-w-5xl"
          }`}
        >
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder=""
              rows={1}
              className="w-full bg-[#1a1d26] text-white text-sm sm:text-[15px] leading-relaxed rounded-xl sm:rounded-2xl border border-gray-700/50 outline-none focus:outline-none pl-4 sm:pl-5 pr-14 sm:pr-16 py-3 sm:py-4 resize-none shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:text-transparent [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
              style={{ maxHeight: "250px" }}
            />

            {/* Placeholder */}
            {!input && !isStreaming && messages.length === 0 && (
              <div
                className={`absolute left-4 sm:left-5 top-3 sm:top-4 text-gray-500 text-sm sm:text-base pointer-events-none transition-opacity duration-300 ${
                  fadePlaceholder ? "opacity-100" : "opacity-0"
                }`}
              >
                {placeholderText}
              </div>
            )}

            {isStreaming && !input && (
              <div className="absolute left-4 sm:left-5 top-3 sm:top-4 text-gray-600 text-sm sm:text-base pointer-events-none">
                ⏳ Waiting for AI response...
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="absolute right-2 bottom-2 sm:bottom-2.5 flex items-center gap-1.5 sm:gap-2 z-20">
            {isStreaming || isThinking ? (
              <button
                onClick={handleStop}
                className="p-2.5 sm:p-3 bg-rose-500/15 text-rose-400 rounded-lg sm:rounded-xl hover:bg-rose-500/25 transition-all shadow-lg hover:shadow-rose-500/30 hover:scale-105"
                title="Stop generation"
              >
                <StopIcon className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="p-2.5 sm:p-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg sm:rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
                title="Send message"
              >
                <PaperAirplaneIcon className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Footer Notice */}
        <p className="text-center text-[10px] sm:text-[11px] text-gray-500 mt-2.5 sm:mt-3.5 font-medium tracking-wide px-4">
          ⚠️ AI responses may contain inaccuracies • Always verify critical
          information
        </p>
      </div>
    </div>
  );
}