import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  RotateCcw,
  SendHorizonal,
  Sparkles,
} from "lucide-react";
import { askKnowledgeBase, type ChatbotResponse, type ChatHistoryTurn } from "@/lib/chatbot/retrieval";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { ChatbotErrorBoundary } from "@/components/ChatbotErrorBoundary";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatbotResponse;
};

const starterPrompts = [
  "Latest CUK admission notification",
  "Contact details for Biotechnology department",
  "How do I apply for leave?",
  "What are the MBA eligibility & requirements?",
  "Where can I find exam timetable & seating?",
  "Scholarships & fee structure details",
];

const MIN_REQUEST_GAP_MS = 1000;

function FormattedMarkdown({ text }: { text: string }) {
  // Simple table & markdown parser to make grounded output wows the user
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeader: string[] = [];

  const parseInline = (str: string): React.ReactNode[] => {
    // Bold, links, code
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(<strong key={match.index} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>);
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(<code key={match.index} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{token.slice(1, -1)}</code>);
      } else if (token.startsWith("[")) {
        const linkText = token.match(/\[(.*?)\]/)?.[1] || "link";
        const linkUrl = token.match(/\((.*?)\)/)?.[1] || "#";
        parts.push(
          <a
            key={match.index}
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-0.5"
          >
            {linkText}
            <ExternalLink className="h-3 w-3 inline" />
          </a>
        );
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }
    return parts;
  };

  const renderTable = (header: string[], rows: string[][], key: number) => (
    <div key={key} className="my-3 overflow-x-auto rounded-lg border border-border/50 bg-background/50">
      <table className="w-full text-left text-xs border-collapse">
        {header.length > 0 && (
          <thead className="bg-muted/60 text-foreground font-semibold border-b border-border/50">
            <tr>
              {header.map((col, i) => (
                <th key={i} className="px-3 py-2 border-r border-border/30 last:border-r-0">
                  {parseInline(col.trim())}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="border-b border-border/20 last:border-b-0 hover:bg-muted/30">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-2 border-r border-border/20 last:border-r-0 text-foreground/90">
                  {parseInline(cell.trim())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.split("|").slice(1, -1);
      if (cells.every((c) => /^:?-+:?$/.test(c.trim()))) {
        // Divider line in markdown table, ignore
        return;
      }
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
        tableRows = [];
      } else {
        tableRows.push(cells);
      }
      return;
    }

    if (inTable) {
      inTable = false;
      elements.push(renderTable(tableHeader, tableRows, idx));
      tableHeader = [];
      tableRows = [];
    }

    if (trimmed.startsWith("### ")) {
      elements.push(<h4 key={idx} className="mt-3 mb-1 text-sm font-bold tracking-tight text-foreground">{parseInline(trimmed.slice(4))}</h4>);
    } else if (trimmed.startsWith("## ")) {
      elements.push(<h3 key={idx} className="mt-4 mb-1.5 text-base font-bold tracking-tight text-foreground">{parseInline(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith("# ")) {
      elements.push(<h2 key={idx} className="mt-4 mb-2 text-lg font-extrabold tracking-tight text-foreground">{parseInline(trimmed.slice(2))}</h2>);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <li key={idx} className="ml-4 list-disc text-sm text-foreground/90 my-0.5">
          {parseInline(trimmed.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s/, "");
      elements.push(
        <li key={idx} className="ml-4 list-decimal text-sm text-foreground/90 my-0.5">
          {parseInline(content)}
        </li>
      );
    } else if (trimmed.length > 0) {
      elements.push(<p key={idx} className="my-1 text-sm leading-relaxed text-foreground/90">{parseInline(trimmed)}</p>);
    } else {
      elements.push(<div key={idx} className="h-1.5" />);
    }
  });

  if (inTable) {
    elements.push(renderTable(tableHeader, tableRows, lines.length));
  }

  return <div className="space-y-0.5">{elements}</div>;
}


function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDisplayName(fullName?: string | null, email?: string | null) {
  const trimmedName = fullName?.trim();
  if (trimmedName) return trimmedName;

  const emailPrefix = email?.split("@")[0]?.trim();
  if (emailPrefix) return emailPrefix;

  return "User";
}

interface ChatbotAssistantProps {
  embedded?: boolean;
}

const ChatbotAssistant = ({ embedded = false }: ChatbotAssistantProps) => {
  const { user, profile } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const lastRequestAtRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userDisplayName = useMemo(
    () => getDisplayName(profile?.full_name, user?.email),
    [profile?.full_name, user?.email]
  );
  const userInitial = useMemo(() => userDisplayName.charAt(0).toUpperCase() || "U", [userDisplayName]);

  const dashboardHome = useMemo(() => {
    const t = profile?.user_type;
    if (t === "teacher") return "/teacher-dashboard";
    if (t === "admin" || t === "department_admin") return "/admin-dashboard";
    return "/student-dashboard";
  }, [profile?.user_type]);

  const isEmptyChat = messages.length === 0;

  useEffect(() => {
    if (embedded) return;
    const raw = localStorage.getItem("cuk-assistant-history");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
    } catch {
      // ignore corrupt cache
    }
  }, [embedded]);

  useEffect(() => {
    if (embedded) return;
    // Limit stored history to last 50 messages to prevent localStorage bloat
    const toStore = messages.slice(-50);
    localStorage.setItem("cuk-assistant-history", JSON.stringify(toStore));
  }, [embedded, messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [query]);

  const canSubmit = useMemo(() => query.trim().length > 2 && !loading, [query, loading]);

  const onSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    const cleaned = query.trim();
    if (cleaned.length < 3 || loading) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: cleaned,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    try {
      const normalized = cleaned.toLowerCase().replace(/[^\w\s]/g, "").trim();
      if (normalized === "hello") {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: `Hello ${userDisplayName}! I'm NeMoX, the CUK academic assistant. I can help you with information about Central University of Kashmir, admissions, exams, schedules, departments, faculty, notices, and more. What would you like to know?`,
          },
        ]);
        return;
      }

      const now = Date.now();
      if (now - lastRequestAtRef.current < MIN_REQUEST_GAP_MS) {
        throw new Error("Please wait a moment before sending another question.");
      }
      lastRequestAtRef.current = now;

      const history: ChatHistoryTurn[] = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await askKnowledgeBase(cleaned, history);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          response,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `I could not answer right now: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSubmit();
    }
  };

  const clearChat = () => {
    setMessages([]);
    if (!embedded) localStorage.removeItem("cuk-assistant-history");
  };

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => {
        setCopiedMessageId((prev) => (prev === message.id ? null : prev));
      }, 1600);
    } catch {
      // If clipboard is unavailable, silently ignore.
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col",
        embedded ? "h-full text-foreground" : "min-h-screen bg-background text-foreground"
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-full w-full flex-col",
          embedded ? "" : "max-w-3xl px-4 py-6 sm:px-6"
        )}
      >
        {/* Top nav (non-embedded only) */}
        {!embedded && (
          <div className="mb-4 flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="hover:bg-accent/50">
              <Link to={dashboardHome}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="flex items-center gap-1.5 rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
              <Sparkles className="h-3 w-3 text-primary" />
              Retrieval-Only
            </div>
          </div>
        )}

        {/* Main card */}
        <Card
          className={cn(
            "flex flex-col overflow-hidden transition-all duration-300",
            embedded
              ? "linear-surface border-0 shadow-none flex-1"
              : "flex-1 border border-border/50 shadow-sm"
          )}
          style={{ minHeight: embedded ? undefined : "calc(100vh - 120px)" }}
        >
          {/* Card header */}
          <CardHeader
            className={cn(
              "flex flex-col gap-3 shrink-0",
              embedded ? "linear-toolbar" : "border-b bg-muted/10 pb-4"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="linear-kicker">AI Support</div>
                <p className="text-base font-semibold tracking-tight">NeMoX</p>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  disabled={loading}
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear chat
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Chat area */}
          <CardContent className="flex flex-1 flex-col p-0 min-h-0">
            <ScrollArea className="flex-1 min-h-0">
              <div className="flex flex-col px-4 pt-6 pb-4 sm:px-6 space-y-6 w-full overflow-x-hidden">

                {/* Empty state greeting */}
                {isEmptyChat && (
                  <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-500">
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {getGreeting()}, {userDisplayName}
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
                      Ask me anything about admissions, exams, scholarships, or university notices.
                    </p>
                    {/* Starter prompts */}
                    <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-lg">
                      {starterPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => setQuery(prompt)}
                          disabled={loading}
                          className="rounded-full border border-border/50 bg-muted/40 px-3.5 py-1.5 text-xs text-foreground/80 transition-all hover:border-primary/40 hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  const sources = message.response?.sources ?? [];

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full",
                        isUser ? "flex-row-reverse justify-center" : "flex-row"
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-widest",
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted border border-border/50 text-muted-foreground"
                        )}
                      >
                        {isUser ? userInitial : "N"}
                      </div>

                      {/* Bubble + sources */}
                      <div
                        className={cn(
                          "flex flex-col gap-2",
                          isUser ? "items-end max-w-[70%]" : "items-start max-w-[85%]"
                        )}
                      >
                        {/* Sender label */}
                        <span className="px-0.5 text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">
                          {isUser ? userDisplayName : "NeMoX"}
                        </span>

                        {/* Message bubble */}
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm w-full",
                            isUser
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-card border border-border/40 text-card-foreground rounded-tl-sm"
                          )}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          ) : (
                            <FormattedMarkdown text={message.content} />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void copyMessage(message);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground/80 hover:bg-muted/40 hover:text-foreground transition-colors"
                          aria-label="Copy message"
                        >
                          {copiedMessageId === message.id ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </button>

                        {/* Inline sources */}
                        {!isUser && sources.length > 0 && (
                          <div className="flex flex-col gap-1.5 w-full pl-0.5">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
                              Sources
                            </p>
                            <div className="flex flex-col gap-1.5">
                              {sources.slice(0, 5).map((source) => (
                                <a
                                  key={`${source.url}-${source.title}`}
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group flex items-center gap-2 rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-xs transition-all hover:border-border/70 hover:bg-muted/60"
                                >
                                  {source.sourceType === "pdf" ? (
                                    <FileText className="h-3 w-3 shrink-0 text-amber-500" />
                                  ) : (
                                    <Globe className="h-3 w-3 shrink-0 text-blue-500" />
                                  )}
                                  <span className="flex-1 truncate font-medium text-foreground/80 group-hover:text-foreground">
                                    {source.title}
                                  </span>
                                  {source.score !== undefined && (
                                    <span className="shrink-0 text-[10px] text-muted-foreground/60">
                                      {(source.score * 100).toFixed(0)}%
                                    </span>
                                  )}
                                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Loading indicator with skeleton */}
                {loading && (
                  <div className="flex gap-3 animate-in fade-in duration-300">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted border border-border/50 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      N
                    </div>
                    <div className="flex flex-col gap-2 items-start max-w-[82%]">
                      <span className="px-0.5 text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">
                        NeMoX
                      </span>
                      <div className="rounded-2xl rounded-tl-sm border border-border/40 bg-card px-4 py-3 shadow-sm w-full">
                        {/* Thinking indicator */}
                        <div className="flex items-center gap-1.5 mb-3">
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/50"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/50"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/50"
                            style={{ animationDelay: "300ms" }}
                          />
                          <span className="ml-1 text-xs text-muted-foreground/60">Thinking...</span>
                        </div>
                        {/* Skeleton lines */}
                        <div className="space-y-2 animate-pulse">
                          <div className="h-3 bg-muted/60 rounded w-full"></div>
                          <div className="h-3 bg-muted/60 rounded w-11/12"></div>
                          <div className="h-3 bg-muted/60 rounded w-4/5"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Input area */}
            <div className="shrink-0 px-4 pb-4 pt-3 sm:px-8">
              {/* Gradient border wrapper */}
              <div
                className="rounded-2xl p-px transition-all duration-300"
                style={{
                  background: query.trim().length > 0
                    ? "linear-gradient(135deg, hsl(var(--primary) / 0.6), hsl(var(--primary) / 0.2), hsl(var(--border) / 0.4))"
                    : "linear-gradient(135deg, hsl(var(--border) / 0.6), hsl(var(--border) / 0.2))",
                  boxShadow: query.trim().length > 0
                    ? "0 0 0 3px hsl(var(--primary) / 0.08), 0 4px 24px hsl(var(--primary) / 0.10)"
                    : "0 2px 12px hsl(var(--foreground) / 0.04)",
                }}
              >
                <form
                  onSubmit={(event) => {
                    void onSubmit(event);
                  }}
                  className="flex flex-col rounded-[15px] bg-card overflow-hidden outline-none"
                >
                  {/* Textarea */}
                  <Textarea
                    ref={textareaRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask about admissions, exams, notices…"
                    disabled={loading}
                    rows={1}
                    className="resize-none border-0 bg-transparent px-4 pt-3.5 pb-1 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none placeholder:text-muted-foreground/40 min-h-0 leading-relaxed"
                    style={{ maxHeight: "140px", overflowY: "auto" }}
                  />

                  {/* Bottom toolbar */}
                  <div className="flex items-center justify-between px-3 pb-3 pt-1">
                    {/* Left hint */}
                    <span className="text-[10px] text-muted-foreground/40 select-none">
                      {loading ? (
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary/50" />
                          NeMoX is thinking…
                        </span>
                      ) : (
                        "Shift+Enter for new line"
                      )}
                    </span>

                    {/* Send button */}
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className={cn(
                        "group relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 overflow-hidden",
                        canSubmit
                          ? "opacity-100 scale-100 shadow-md"
                          : "opacity-35 scale-95 cursor-not-allowed"
                      )}
                      style={
                        canSubmit
                          ? {
                              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
                              boxShadow: "0 2px 8px hsl(var(--primary) / 0.35)",
                            }
                          : {
                              background: "hsl(var(--muted))",
                            }
                      }
                    >
                      {/* Shine sweep on hover */}
                      <span
                        className="absolute inset-0 translate-x-[-100%] bg-white/20 skew-x-12 transition-transform duration-500 group-hover:translate-x-[150%]"
                        aria-hidden
                      />
                      <SendHorizonal
                        className={cn(
                          "h-3.5 w-3.5 relative z-10 transition-transform duration-200",
                          canSubmit ? "text-primary-foreground group-hover:translate-x-0.5" : "text-muted-foreground"
                        )}
                      />
                    </button>
                  </div>
                </form>
              </div>

              <p className="mt-2 text-center text-[10px] text-muted-foreground/35 select-none">
                Powered by NeMoX · Verified knowledge base
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function ChatbotAssistantWithErrorBoundary() {
  return (
    <ChatbotErrorBoundary>
      <ChatbotAssistant />
    </ChatbotErrorBoundary>
  );
}

export default ChatbotAssistantWithErrorBoundary;