import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bot, ExternalLink, FileText, Globe, SendHorizonal, Sparkles } from "lucide-react";
import { askKnowledgeBase, type ChatbotResponse } from "@/lib/chatbot/retrieval";
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
];

const ChatbotAssistant = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I am your zero-credit campus assistant. I answer from crawled website and PDF content only, and I always show source links.",
      meta: "No paid AI inference used",
    },
  ]);

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
      const response = await askKnowledgeBase(cleaned);
      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        meta: `${response.matchCount} matches in ${response.elapsedMs}ms`,
        response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `I could not answer right now: ${message}`,
          meta: "Please verify /chatbot/knowledge-base.json is present.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Bot className="h-6 w-6" />
              CUK Knowledge Chatbot
            </CardTitle>
            <CardDescription>
              Built from crawled content in `crawl.csv` plus PDF sources. Answers are extractive and include references.
            </CardDescription>
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

            <ScrollArea className="h-[55vh] rounded-md border p-3">
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
                      <div className="mt-3 space-y-2">
                        {message.response.sources.slice(0, 4).map((source) => (
                          <a
                            key={`${source.url}-${source.title}`}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted/60"
                          >
                            <span className="flex items-center gap-2">
                              {source.sourceType === "pdf" ? (
                                <FileText className="h-4 w-4 text-amber-600" />
                              ) : (
                                <Globe className="h-4 w-4 text-blue-600" />
                              )}
                              <span className="line-clamp-1">{source.title}</span>
                            </span>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

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
