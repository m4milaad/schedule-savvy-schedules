type SourceType = "web" | "pdf";

type KnowledgeDocument = {
  id: string;
  title: string;
  sourceUrl: string;
  sourceName: string;
  category: string;
  sourceType: SourceType;
  content: string;
  keywords: string[];
};

type KnowledgeBase = {
  generatedAt: string;
  sourceCount: number;
  documentCount: number;
  documents: KnowledgeDocument[];
};

export type ChatbotSource = {
  title: string;
  url: string;
  sourceName: string;
  sourceType: SourceType;
  category: string;
};

export type ChatbotResponse = {
  answer: string;
  sources: ChatbotSource[];
  matchCount: number;
  elapsedMs: number;
};

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "if",
  "in", "into", "is", "it", "its", "of", "on", "or", "that", "the", "their", "there",
  "this", "to", "was", "were", "will", "with", "you", "your", "we", "our", "they", "them",
  "he", "she", "his", "her", "not", "can", "about", "after", "before", "also", "more", "all",
]);

let knowledgeBasePromise: Promise<KnowledgeBase> | null = null;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value: string) =>
  normalize(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));

const sentencePreview = (content: string, maxChars = 280) => {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= maxChars) return flat;
  const cut = flat.slice(0, maxChars);
  const lastPunctuation = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "), cut.lastIndexOf(", "));
  return `${cut.slice(0, lastPunctuation > 150 ? lastPunctuation + 1 : maxChars).trim()}...`;
};

const loadKnowledgeBase = async (): Promise<KnowledgeBase> => {
  if (!knowledgeBasePromise) {
    knowledgeBasePromise = fetch("/chatbot/knowledge-base.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load chatbot knowledge base.");
        return res.json() as Promise<KnowledgeBase>;
      });
  }
  return knowledgeBasePromise;
};

export const askKnowledgeBase = async (question: string): Promise<ChatbotResponse> => {
  const startedAt = performance.now();
  const kb = await loadKnowledgeBase();
  const terms = tokenize(question);

  if (!terms.length) {
    return {
      answer: "Please type a more specific question (for example: 'latest CUK UG admission notice' or 'CUET UG eligibility PDF').",
      sources: [],
      matchCount: 0,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
  }

  const scored = kb.documents
    .map((doc) => {
      const haystack = normalize(`${doc.title} ${doc.content} ${doc.keywords.join(" ")}`);
      let score = 0;

      for (const term of terms) {
        const occurrences = haystack.split(term).length - 1;
        if (occurrences > 0) score += 1 + Math.min(occurrences, 4) * 0.7;
      }

      const phrase = normalize(question);
      if (phrase.length > 10 && haystack.includes(phrase)) score += 5;
      if (doc.sourceType === "pdf" && /pdf|bulletin|prospectus|notification|notice/.test(phrase)) score += 1;

      return { doc, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return {
      answer: "I could not find a strong match in the current crawled data. Try adding keywords like university name, exam name, or 'PDF'.",
      sources: [],
      matchCount: 0,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
  }

  const topMatches = scored.slice(0, 4);
  const snippets = topMatches.map((entry) => `- ${sentencePreview(entry.doc.content)}`);

  const uniqueSources = new Map<string, ChatbotSource>();
  for (const entry of topMatches) {
    const sourceKey = `${entry.doc.sourceUrl}::${entry.doc.title}`;
    if (!uniqueSources.has(sourceKey)) {
      uniqueSources.set(sourceKey, {
        title: entry.doc.title,
        url: entry.doc.sourceUrl,
        sourceName: entry.doc.sourceName,
        sourceType: entry.doc.sourceType,
        category: entry.doc.category,
      });
    }
  }

  return {
    answer: `Here is what I found from the crawled knowledge base:\n\n${snippets.join("\n")}`,
    sources: [...uniqueSources.values()],
    matchCount: scored.length,
    elapsedMs: Math.round(performance.now() - startedAt),
  };
};
