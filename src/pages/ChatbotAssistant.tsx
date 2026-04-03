import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  BrainCircuit,
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
import { cn } from "@/lib/utils";

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
        "Hello, I am the CUK Knowledge Assistant. I can help answer questions about admissions, exams, scholarships, and regulations using our verified knowledge base.",
      meta: "Knowledge Assistant",
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
        "Chat reset complete. How else can I help you today?",
      meta: "Ready",
    };
    setMessages([welcome]);
    setActiveSources([]);
    if (!embedded) localStorage.removeItem("cuk-assistant-history");
  };

  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant" && m.response);
  const totalCitations = latestAssistant?.response?.sources.length ?? activeSources.length;
  const avgLatency = latestAssistant?.response?.elapsedMs ?? 0;

  return (
    <div className={cn("flex flex-col h-full", embedded ? "text-foreground" : "min-h-screen bg-background text-foreground")}>
      <div className={cn("mx-auto flex h-full w-full flex-col gap-4", embedded ? "" : "max-w-6xl px-4 py-6 sm:px-6 lg:px-8")}>
        {!embedded && (
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="hover:bg-accent/50">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <Badge variant="outline" className="gap-2 bg-background/50 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Retrieval-Only Assistant
            </Badge>
          </div>
        )}

        <Card className={cn("flex flex-col flex-1 overflow-hidden transition-all duration-300", embedded ? "linear-surface border-0 shadow-none" : "border shadow-sm")}>
          <CardHeader className={cn("flex flex-col gap-3", embedded ? "linear-toolbar" : "border-b bg-muted/10 pb-4")}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="linear-kicker">AI Support</div>
                <CardTitle className="text-base font-semibold">
                  {embedded ? "Knowledge Assistant" : "Knowledge Chatbot"}
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="linear-pill hidden sm:flex">
                  <Database className="h-3 w-3 text-muted-foreground" />
                  <span>{messages.length - 1} replies</span>
                </div>
                <div className="linear-pill hidden sm:flex">
                  <Timer className="h-3 w-3 text-muted-foreground" />
                  <span>{avgLatency}ms</span>
                </div>
                <div className="linear-pill">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span>{totalCitations} sources</span>
                </div>
                <Button variant="outline" size="sm" onClick={clearChat} disabled={loading} className="h-8 ml-1">
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-4 p-4 sm:p-6 min-h-[500px]">
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {starterPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="secondary"
                    size="sm"
                    onClick={() => setQuery(prompt)}
                    disabled={loading}
                    className="rounded-full bg-secondary/50 text-xs hover:bg-secondary border border-border/40 transition-colors"
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            )}

            <div className="grid flex-1 gap-6 xl:grid-cols-12 min-h-0">
              <div className="flex flex-col gap-4 xl:col-span-8 min-h-0">
                <ScrollArea className="flex-1 rounded-xl border border-border/40 bg-muted/10 shadow-inner">
                  <div className="flex flex-col space-y-4 p-4 pr-6">
                    {messages.map((message) => {
                      const isUser = message.role === "user";
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex flex-col gap-1 w-fit max-w-[85%] sm:max-w-[75%]",
                            isUser ? "ml-auto" : "mr-auto"
                          )}
                        >
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                              isUser
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-card border border-border/50 text-card-foreground rounded-tl-sm"
                            )}
                          >
                            <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
                          </div>
                          
                          <div className={cn(
                            "flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5",
                            isUser ? "justify-end pr-1" : "justify-start pl-1"
                          )}>
                            <span>{isUser ? "You" : "Assistant"}</span>
                            {message.meta && (
                              <>
                                <span className="opacity-50">•</span>
                                <span className="opacity-80 truncate max-w-[150px]">{message.meta}</span>
                              </>
                            )}
                          </div>

                          {!isUser && message.response?.sources && message.response.sources.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1.5 pl-1">
                              {message.response.sources.slice(0, 3).map((source) => (
                                <Badge key={`${source.url}-${source.title}`} variant="outline" className="gap-1 bg-background/50 text-[10px] py-0 h-5">
                                  {source.sourceType === "pdf" ? <FileText className="h-2.5 w-2.5 opacity-70" /> : <Globe className="h-2.5 w-2.5 opacity-70" />}
                                  {(source.score ?? 0).toFixed(2)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {loading && (
                      <div className="mr-auto flex w-fit max-w-[85%] flex-col gap-1">
                         <div className="rounded-2xl rounded-tl-sm border border-border/50 bg-card px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="flex h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '0ms' }} />
                              <span className="flex h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '150ms' }} />
                              <span className="flex h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '300ms' }} />
                            </div>
                         </div>
                         <div className="pl-1 text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                           Assistant • Searching sources...
                         </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <form onSubmit={onSubmit} className="relative mt-auto flex items-center">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ask about admissions, exams, notices, scholarships..."
                    disabled={loading}
                    className="h-12 rounded-xl pr-12 shadow-sm border-border/50 bg-card focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={!canSubmit}
                    className={cn(
                      "absolute right-1.5 top-1.5 h-9 w-9 rounded-lg transition-all",
                      canSubmit ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <SendHorizonal className="h-4 w-4" />
                  </Button>
                </form>
              </div>

              <div className="hidden xl:flex xl:col-span-4 flex-col gap-3 min-h-0">
                <div className="flex-1 rounded-xl border border-border/40 bg-muted/10 p-4 shadow-inner overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Cited Sources</h3>
                  </div>
                  
                  <ScrollArea className="flex-1 pr-2">
                    {activeSources.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-center gap-3 text-muted-foreground/60">
                         <Globe className="h-8 w-8 stroke-[1.5]" />
                         <p className="text-xs max-w-[180px]">Ask a question to see relevant source links here.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeSources.slice(0, 8).map((source) => (
                          <a
                            key={`${source.url}-${source.title}`}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex flex-col gap-1.5 rounded-lg border border-border/30 bg-card p-3 shadow-sm transition-all hover:border-border/80 hover:shadow-md"
                          >
                            <span className="flex items-start gap-2">
                              {source.sourceType === "pdf" ? (
                                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                              ) : (
                                <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                              )}
                              <span className="line-clamp-2 text-xs font-medium leading-tight group-hover:text-primary transition-colors">
                                {source.title}
                              </span>
                            </span>
                            <div className="flex items-center justify-between pl-5">
                               <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-muted/50 rounded-sm">
                                  Score: {(source.score ?? 0).toFixed(2)}
                               </Badge>
                               <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatbotAssistant;
