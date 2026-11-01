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
  ArrowUp,

} from "lucide-react";
import { askKnowledgeBase, type ChatbotResponse, type ChatHistoryTurn } from "@/lib/chatbot/retrieval";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group";
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


  const sendPrompt = (prompt: string) => {
    setQuery(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className={cn("flex flex-col text-foreground", embedded ? "h-[calc(100dvh-10rem)] min-h-[480px]" : "min-h-screen bg-background")}>
      <div className={cn("mx-auto flex w-full flex-1 flex-col min-h-0", !embedded && "max-w-3xl px-4 py-6 sm:px-6")}>
        {!embedded && (
          <div className="mb-4 flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link to={dashboardHome}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to dashboard
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">Answers from CUK and UGC documents</span>
          </div>
        )}

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
            <span className="text-sm font-medium">{isEmptyChat ? "New conversation" : `${messages.length} messages`}</span>
            {!isEmptyChat && (
              <Button variant="ghost" size="sm" onClick={clearChat} disabled={loading} className="h-8 gap-1.5 text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
              {isEmptyChat && (
                <div>
                  <h2 className="text-base font-semibold">Ask NeMoX</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Admissions, exams, departments, scholarships and notices, with the documents it used.
                  </p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => sendPrompt(prompt)}
                        disabled={loading}
                        className="rounded-md border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => {
                const isUser = message.role === "user";
                const sources = message.response?.sources ?? [];
                if (isUser) {
                  return (
                    <div key={message.id} className="flex justify-end">
                      <p className="max-w-[80%] whitespace-pre-wrap break-words rounded-lg bg-muted px-3.5 py-2.5 text-sm">
                        {message.content}
                      </p>
                    </div>
                  );
                }
                return (
                  <div key={message.id} className="group flex flex-col gap-2">
                    <FormattedMarkdown text={message.content} />
                    {sources.length > 0 && (
                      <ul className="flex flex-col gap-1 border-l pl-3">
                        {sources.slice(0, 5).map((source) => (
                          <li key={`${source.url}-${source.title}`}>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {source.sourceType === "pdf" ? <FileText className="h-3 w-3 shrink-0" /> : <Globe className="h-3 w-3 shrink-0" />}
                              <span className="truncate">{source.title}</span>
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => void copyMessage(message)}
                      className="inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Copy answer"
                    >
                      {copiedMessageId === message.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedMessageId === message.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                );
              })}

              {loading && (
                <div className="flex flex-col gap-2" aria-live="polite">
                  <span className="text-xs text-muted-foreground">Searching documents…</span>
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-11/12" />
                  <Skeleton className="h-3.5 w-3/5" />
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <form
            onSubmit={(event) => void onSubmit(event)}
            className="shrink-0 border-t p-3"
          >
            <InputGroup className="mx-auto max-w-3xl bg-card">
              <InputGroupTextarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about admissions, exams, notices…"
                aria-label="Message"
                disabled={loading}
                rows={1}
                className="min-h-0 text-sm"
                style={{ maxHeight: "140px", overflowY: "auto" }}
              />
              <InputGroupAddon align="block-end" className="border-t">
                <InputGroupText className="text-xs">Enter to send · Shift+Enter for a new line</InputGroupText>
                <InputGroupButton type="submit" variant="default" size="icon-sm" className="ml-auto rounded-full" disabled={!canSubmit} aria-label="Send">
                  <ArrowUp />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </section>
      </div>
    </div>
  );
};

function ChatbotAssistantWithErrorBoundary(props: ChatbotAssistantProps) {
  return (
    <ChatbotErrorBoundary>
      <ChatbotAssistant {...props} />
    </ChatbotErrorBoundary>
  );
}

export default ChatbotAssistantWithErrorBoundary;