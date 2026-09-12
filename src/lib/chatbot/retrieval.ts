type SourceType = "web" | "pdf" | "doc";

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
const isLocalhostChatbotUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(rawApiBaseUrl);

const API_BASE_URL = rawApiBaseUrl;
const REQUEST_TIMEOUT_MS = 25000;

export const askKnowledgeBase = async (
  question: string,
  history: ChatHistoryTurn[] = [],
): Promise<ChatbotResponse> => {
  if (import.meta.env.PROD && isLocalhostChatbotUrl) {
    throw new Error(
      "Chat assistant is not configured for production. Set VITE_CHATBOT_API_URL to your deployed API.",
    );
  }
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
      const isDoc = normalizedUrl.toLowerCase().endsWith(".docx") || normalizedUrl.toLowerCase().endsWith(".doc");
      return {
        title: source.page_title || "Official CUK Document",
        url: normalizedUrl,
        sourceType: isPdf ? "pdf" : isDoc ? "doc" : "web",
        score: Number(source.score || 0),
      };
    });
    return {
      answer: payload.answer || "No answer returned.",
      sources,
      matchCount: sources.length,
      elapsedMs: Math.round(performance.now() - startedAt),
      mode: payload.mode || "hybrid_rag",
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Please check your backend connection.");
    }
    
    // In dev mode, if server is unreachable, provide a graceful grounded fallback response
    if (import.meta.env.DEV && isLocalhostChatbotUrl) {
      console.warn("Backend API server unreachable at", API_BASE_URL, "- returning demo fallback response.");
      return {
        answer: `[DEMO MODE] **Central University of Kashmir (CUK)**\n\nI am currently running in offline demo mode as the Python RAG backend server at \`${API_BASE_URL}\` is not responding.\n\n### Key CUK Information\n- **Official Website**: [cukashmir.ac.in](https://cukashmir.ac.in)\n- **Admissions**: CUET UG & PG based admissions for current academic session.\n- **Departments**: Biotechnology, Management Studies, Law, Physics, Information Technology, English, Economics, Education.\n\n*To enable live vector database Q&A and cross-encoder reranking, please start the Python backend using \`python -m uvicorn backend.main:app --reload\`.*`,
        sources: [
          {
            title: "Central University of Kashmir Official Portal",
            url: "https://cukashmir.ac.in",
            sourceType: "web",
            score: 0.95,
          },
          {
            title: "CUK Admissions & Prospectus PDF",
            url: "https://cukashmir.ac.in/prospectus.pdf",
            sourceType: "pdf",
            score: 0.88,
          },
        ],
        matchCount: 2,
        elapsedMs: Math.round(performance.now() - startedAt),
        mode: "demo_fallback",
      };
    }
    
    throw error instanceof Error ? error : new Error("Unexpected chatbot error.");
  } finally {
    window.clearTimeout(timeout);
  }
};

