import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  ExternalLink,
  FileText,
  Globe,
  RotateCcw,
  SendHorizonal,
  Sparkles,
  Timer,
  Database,
} from "lucide-react";
import { askKnowledgeBase, type ChatbotResponse, type ChatHistoryTurn } from "@/lib/chatbot/retrieval";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: string;
  response?: ChatbotResponse;
};

const starterPrompts = [
  "Latest CUK admission notification",
  "CUET UG information bulletin PDF",
  "UGC fake universities notice",
  "Scholarship portals for students",
  "How do I contact the examination department?",
  "What are the MBA admission requirements?",
];
const MIN_REQUEST_GAP_MS = 1500;

interface ChatbotAssistantProps {
  embedded?: boolean;
}

const ChatbotAssistant = ({ embedded = false }: ChatbotAssistantProps) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content:
        "I am your zero-credit campus assistant. I answer from crawled website and PDF content only, and I always show source links.",
      meta: "No paid AI inference used",
    },
  ]);
  const [activeSources, setActiveSources] = useState<ChatbotResponse["sources"]>([]);
  const lastRequestAtRef = useRef(0);

  useEffect(() => {
    if (embedded) return;
    const raw = localStorage.getItem("cuk-assistant-history");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed);
        const lastAssistant = [...parsed].reverse().find((m) => m.role === "assistant" && m.response?.sources);
        setActiveSources(lastAssistant?.response?.sources ?? []);
      }
    } catch {
      // ignore corrupt local cache
    }
  }, [embedded]);

  useEffect(() => {
    if (embedded) return;
    localStorage.setItem("cuk-assistant-history", JSON.stringify(messages));
  }, [embedded, messages]);

  const canSubmit = useMemo(() => query.trim().length > 2 && !loading, [query, loading]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
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
      const now = Date.now();
      if (now - lastRequestAtRef.current < MIN_REQUEST_GAP_MS) {
        throw new Error("Please wait a moment before sending another question.");
      }
      lastRequestAtRef.current = now;

      const history: ChatHistoryTurn[] = messages
        .filter((m) => (m.role === "user" || m.role === "assistant") && !m.id.startsWith("welcome"))
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await askKnowledgeBase(cleaned, history);
      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        meta: `${response.mode.toUpperCase()} | ${response.matchCount} sources in ${response.elapsedMs}ms`,
        response,
      };
      setActiveSources(response.sources);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `I could not answer right now: ${message}`,
          meta: "Please verify backend /chat endpoint is reachable.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    const welcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content:
        "Chat reset complete. Ask anything about admissions, notices, exams, scholarships, or regulations.",
      meta: "Knowledge base mode",
    };
    setMessages([welcome]);
    setActiveSources([]);
    if (!embedded) localStorage.removeItem("cuk-assistant-history");
  };

  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant" && m.response);
  const totalCitations = latestAssistant?.response?.sources.length ?? activeSources.length;
  const avgLatency = latestAssistant?.response?.elapsedMs ?? 0;

  return (
    <div className={embedded ? "text-foreground" : "min-h-screen bg-background text-foreground"}>
      <div className={embedded ? "mx-auto flex w-full flex-col gap-4" : "mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8"}>
        {!embedded && (
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <Badge variant="outline" className="gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Retrieval-Only Assistant
            </Badge>
          </div>
        )}

        <Card className={embedded ? "linear-surface overflow-hidden" : ""}>
          <CardHeader className={embedded ? "linear-toolbar" : ""}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Bot className="h-6 w-6" />
                  {embedded ? "CUK Knowledge Assistant" : "CUK Knowledge Chatbot"}
                </CardTitle>
                <CardDescription className="mt-1">
                  Built from crawled content in `crawl.csv` plus PDF sources. Answers are extractive and include references.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1.5">
                  <Database className="h-3.5 w-3.5" />
                  {messages.length - 1} replies
                </Badge>
                <Badge variant="outline" className="gap-1.5">
                  <Timer className="h-3.5 w-3.5" />
                  {avgLatency}ms
                </Badge>
                <Badge variant="outline" className="gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  {totalCitations} citations
                </Badge>
                <Button variant="outline" size="sm" onClick={clearChat} disabled={loading}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="secondary"
                  size="sm"
                  onClick={() => setQuery(prompt)}
                  disabled={loading}
                >
                  {prompt}
                </Button>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-12">
              <ScrollArea className="h-[55vh] rounded-md border p-3 xl:col-span-8">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg p-3 ${message.role === "user" ? "bg-primary/10" : "bg-muted/50"}`}
                    >
                      <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                        <span>{message.role === "user" ? "You" : "Assistant"}</span>
                        {message.meta && <span>{message.meta}</span>}
                      </div>
                      <p className="whitespace-pre-line text-sm">{message.content}</p>

                      {message.response?.sources && message.response.sources.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {message.response.sources.slice(0, 4).map((source) => (
                            <Badge key={`${source.url}-${source.title}`} variant="secondary" className="gap-1.5">
                              {source.sourceType === "pdf" ? <FileText className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                              {(source.score ?? 0).toFixed(2)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Assistant</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
                        Searching crawled sources...
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="space-y-3 xl:col-span-4">
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="mb-2 text-sm font-medium">Cited Sources</div>
                  {activeSources.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Ask a question to see source links here.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeSources.slice(0, 6).map((source) => (
                        <a
                          key={`${source.url}-${source.title}`}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-md border bg-background px-2.5 py-2 text-sm hover:bg-muted/50"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {source.sourceType === "pdf" ? (
                              <FileText className="h-4 w-4 shrink-0 text-amber-600" />
                            ) : (
                              <Globe className="h-4 w-4 shrink-0 text-blue-600" />
                            )}
                            <span className="line-clamp-1">{source.title}</span>
                          </span>
                          <ExternalLink className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="flex gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ask about admissions, exams, notices, UGC rules, scholarships..."
                disabled={loading}
              />
              <Button type="submit" disabled={!canSubmit}>
                <SendHorizonal className="mr-2 h-4 w-4" />
                Ask
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatbotAssistant;
