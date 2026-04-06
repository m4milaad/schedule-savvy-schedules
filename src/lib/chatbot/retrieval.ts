type SourceType = "web" | "pdf";

export type ChatbotSource = {
  title: string;
  url: string;
  sourceType: SourceType;
  score: number;
};

export type ChatbotResponse = {
  answer: string;
  sources: ChatbotSource[];
  matchCount: number;
  elapsedMs: number;
  mode: string;
};

export type ChatHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

type BackendSource = {
  source_url: string;
  page_title: string;
  score?: number;
};

type BackendChatResponse = {
  answer: string;
  sources: BackendSource[];
  mode?: string;
};

const rawApiBaseUrl = (import.meta.env.VITE_CHATBOT_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const isLocalhostUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(rawApiBaseUrl);

if (import.meta.env.PROD && isLocalhostUrl) {
  throw new Error("VITE_CHATBOT_API_URL must point to a deployed backend in production builds.");
}

const API_BASE_URL = rawApiBaseUrl;
const REQUEST_TIMEOUT_MS = 250000;

export const askKnowledgeBase = async (
  question: string,
  history: ChatHistoryTurn[] = [],
): Promise<ChatbotResponse> => {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        query: question,
        history: history.slice(-8),
      }),
    });
    if (!response.ok) {
      throw new Error(`Backend request failed (${response.status}).`);
    }
    const payload = (await response.json()) as BackendChatResponse;
    const sources: ChatbotSource[] = (payload.sources || []).map((source) => {
      const normalizedUrl = source.source_url || "";
      const isPdf = normalizedUrl.toLowerCase().endsWith(".pdf");
      return {
        title: source.page_title || "Source",
        url: normalizedUrl,
        sourceType: isPdf ? "pdf" : "web",
        score: Number(source.score || 0),
      };
    });
    return {
      answer: payload.answer || "No answer returned.",
      sources,
      matchCount: sources.length,
      elapsedMs: Math.round(performance.now() - startedAt),
      mode: payload.mode || "unknown",
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Please retry in a few seconds.");
    }
    throw error instanceof Error ? error : new Error("Unexpected chatbot error.");
  } finally {
    window.clearTimeout(timeout);
  }
};
