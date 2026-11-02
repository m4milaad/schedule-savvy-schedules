import { supabase } from "@/integrations/supabase/client";
import logger from "@/lib/logger";
import { SCRAPED_CUK_DATA, type ScrapedChunk } from "@/lib/chatbot/scraped_data";

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

const envApiUrl = (import.meta.env.VITE_CHATBOT_API_URL as string | undefined) || "";
const rawApiBaseUrl = envApiUrl.replace(/\/+$/, "");
const API_BASE_URL = rawApiBaseUrl;
const isLocalhostChatbotUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(API_BASE_URL);
const isHttpsProduction = typeof window !== "undefined" && window.location.protocol === "https:";

const REQUEST_TIMEOUT_MS = 12000;

async function fallbackGroundedSearch(question: string): Promise<ChatbotResponse> {
  const startedAt = performance.now();
  const qLower = question.toLowerCase();
  const tokens = qLower.split(/\W+/).filter((t) => t.length > 2);

  // 1. Search scraped university database (236 records from CUK APIs & PDFs)
  const scrapedMatches: { chunk: ScrapedChunk; score: number }[] = [];
  if (Array.isArray(SCRAPED_CUK_DATA)) {
    for (const chunk of SCRAPED_CUK_DATA) {
      if (!chunk) continue;
      const textLower = (chunk.text || "").toLowerCase();
      const titleLower = (chunk.title || "").toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (titleLower.includes(t)) score += 3;
        if (textLower.includes(t)) score += 1;
      }
      if (score > 0) {
        scrapedMatches.push({ chunk, score });
      }
    }
  }
  scrapedMatches.sort((a, b) => b.score - a.score);

  const best = scrapedMatches[0];
  if (best && best.score >= 2) {
    const topMatches = scrapedMatches.slice(0, 3);
    const top = best.chunk;

    const sources: ChatbotSource[] = topMatches.map((m) => {
      const u = m.chunk.url || "https://cukashmir.ac.in";
      return {
        title: m.chunk.title || "Scraped CUK Record",
        url: u,
        sourceType: u.endsWith(".pdf") ? "pdf" : u.endsWith(".doc") || u.endsWith(".docx") ? "doc" : "web",
        score: Math.min(0.98, 0.7 + m.score * 0.05),
      };
    });

    let formattedAnswer = `### Grounded Information: ${top.title || "CUK Record"}\n\n${top.text || ""}`;
    if (topMatches.length > 1) {
      formattedAnswer += `\n\n### Related University Notices & Information:\n` +
        topMatches.slice(1).map((m) => `- **${m.chunk.title || "Record"}**: ${(m.chunk.text || "").split("\n")[1] || (m.chunk.text || "").slice(0, 120)}...`).join("\n");
    }

    return {
      answer: formattedAnswer,
      sources,
      matchCount: sources.length,
      elapsedMs: Math.round(performance.now() - startedAt),
      mode: "scraped_data_retrieval",
    };
  }

  // 2. Try querying Supabase for live notices and matching rag_documents
  const supabaseSources: ChatbotSource[] = [];
  let supabaseAnswerExt = "";

  try {
    const { data: notices } = await supabase
      .from("notices")
      .select("title, content, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (notices && notices.length > 0) {
      const matchingNotice = notices.find((n) =>
        Boolean(n && n.title) && tokens.some((word) => (n.title || "").toLowerCase().includes(word))
      );
      if (matchingNotice) {
        supabaseAnswerExt = `\n\n### Latest Notice: ${matchingNotice.title}\n${matchingNotice.content}`;
        supabaseSources.push({
          title: `Notice: ${matchingNotice.title}`,
          url: "https://cukashmir.ac.in",
          sourceType: "web",
          score: 0.92,
        });
      }
    }
  } catch {
    // Ignore Supabase connection issues silently
  }

  // Default fallback for unmatched queries
  const defaultSources: ChatbotSource[] = [
    {
      title: "Central University of Kashmir Portal",
      url: "https://cukashmir.ac.in",
      sourceType: "web",
      score: 0.9,
    },
    ...supabaseSources,
  ];

  return {
    // No made-up contacts here: only the official site, which has the current ones.
    answer: `### Central University of Kashmir Knowledge Assistant

I could not find **"${question}"** in the university records I have.

For admissions, departments, exams and contacts, see the official website: [cukashmir.ac.in](https://cukashmir.ac.in). Your exam schedule, seat and leave applications are in your dashboard.${supabaseAnswerExt}`,
    sources: defaultSources,
    matchCount: defaultSources.length,
    elapsedMs: Math.round(performance.now() - startedAt),
    mode: "grounded_fallback",
  };
}


export const askKnowledgeBase = async (
  question: string,
  history: ChatHistoryTurn[] = [],
): Promise<ChatbotResponse> => {
  const startedAt = performance.now();

  // If a valid custom API URL is set (and not localhost when running on HTTPS production), try fetching backend API
  const canAttemptBackend = Boolean(API_BASE_URL) && (!isHttpsProduction || !isLocalhostChatbotUrl);

  if (canAttemptBackend) {
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
      if (response.ok) {
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
      }
    } catch (error) {
      logger.warn("Backend API request failed or unreachable, falling back to grounded knowledge engine:", error);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  // Fallback seamlessly to Supabase + Grounded Knowledge Engine
  return fallbackGroundedSearch(question);
};


