import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CRAWL_CSV = path.join(ROOT, "crawl.csv");
const OUTPUT_PATH = path.join(ROOT, "public", "chatbot", "knowledge-base.json");

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "if",
  "in", "into", "is", "it", "its", "of", "on", "or", "that", "the", "their", "there",
  "this", "to", "was", "were", "will", "with", "you", "your", "we", "our", "they", "them",
  "he", "she", "his", "her", "not", "can", "about", "after", "before", "also", "more", "all",
]);

const parseCsv = (raw) => {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const [category, name, url] = lines[i].split(",");
    if (!url) continue;
    rows.push({
      category: category?.trim() ?? "General",
      name: name?.trim() ?? url.trim(),
      url: url.trim(),
    });
  }
  return rows;
};

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value) =>
  normalize(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));

const splitSections = (raw) => {
  const matches = [...raw.matchAll(/(?:^|\n)# (.+?)\nURL: (.+?)\n([\s\S]*?)(?=\n# .+?\nURL: |\s*$)/g)];
  return matches.map((m) => ({
    title: m[1].trim(),
    url: m[2].trim(),
    content: m[3].trim(),
  }));
};

const domainOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const chunkText = (text, maxChars = 900) => {
  const cleaned = text.replace(/\n{3,}/g, "\n\n");
  const chunks = [];
  let cursor = 0;
  while (cursor < cleaned.length) {
    const slice = cleaned.slice(cursor, cursor + maxChars);
    const breakIndex = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(". "));
    const end = breakIndex > 300 ? cursor + breakIndex + 1 : cursor + maxChars;
    chunks.push(cleaned.slice(cursor, end).trim());
    cursor = end;
  }
  return chunks.filter((chunk) => chunk.length > 120);
};

const buildKnowledgeBase = (sourceRows, exaSections) => {
  const sourceDomains = new Set(sourceRows.map((row) => domainOf(row.url)).filter(Boolean));
  const sourceByUrl = new Map(sourceRows.map((row) => [row.url, row]));

  const docs = [];
  let docCounter = 1;

  for (const section of exaSections) {
    const host = domainOf(section.url);
    const include = sourceDomains.has(host) || /\.pdf(\?|$)/i.test(section.url);
    if (!include || section.content.length < 160) continue;

    const sourceMeta = sourceByUrl.get(section.url);
    const chunks = chunkText(section.content);
    if (!chunks.length) continue;

    chunks.forEach((chunk, idx) => {
      const tokens = tokenize(`${section.title} ${chunk}`);
      docs.push({
        id: `doc_${docCounter}_${idx + 1}`,
        title: section.title,
        sourceUrl: section.url,
        sourceName: sourceMeta?.name ?? host,
        category: sourceMeta?.category ?? (section.url.toLowerCase().includes(".pdf") ? "PDF" : "General"),
        sourceType: section.url.toLowerCase().includes(".pdf") ? "pdf" : "web",
        content: chunk,
        keywords: [...new Set(tokens)].slice(0, 35),
      });
    });
    docCounter += 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceCount: sourceRows.length,
    documentCount: docs.length,
    documents: docs,
  };
};

const main = async () => {
  const dumpPaths = process.argv.slice(2);
  if (!dumpPaths.length) {
    throw new Error("Pass one or more Exa dump file paths to build the chatbot knowledge base.");
  }

  const csvRaw = await fs.readFile(CRAWL_CSV, "utf8");
  const sourceRows = parseCsv(csvRaw);

  const allSections = [];
  for (const dumpPath of dumpPaths) {
    const raw = await fs.readFile(dumpPath, "utf8");
    allSections.push(...splitSections(raw));
  }

  const kb = buildKnowledgeBase(sourceRows, allSections);
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(kb, null, 2), "utf8");
  console.log(`Knowledge base generated: ${OUTPUT_PATH}`);
  console.log(`Documents: ${kb.documentCount}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
