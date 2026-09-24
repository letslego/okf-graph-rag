import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { KvCache } from "./kv.js";

export type RagChunk = {
  id: string;
  docId: string;
  docTitle: string;
  sourcePath: string;
  chunkIndex: number;
  text: string;
  tokens: string[];
  termFreq: Record<string, number>;
};

export type RankedChunk = {
  chunk: RagChunk;
  score: number;
};

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "for",
  "on",
  "is",
  "are",
  "was",
  "were",
  "be",
  "as",
  "by",
  "with",
  "that",
  "this",
  "it",
  "from",
  "at",
  "we",
  "our",
  "you",
  "your",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export function chunkDocument(text: string, maxChars = 700): string[] {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const block of blocks) {
    if ((current + "\n\n" + block).length > maxChars && current) {
      chunks.push(current.trim());
      current = block;
    } else {
      current = current ? `${current}\n\n${block}` : block;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function ingestSourceDocs(
  docsRoot: string,
  cache: KvCache<RagChunk>,
): Promise<{ docs: number; chunks: number }> {
  cache.clear();
  const files = await fg("**/*.{md,txt}", {
    cwd: docsRoot,
    absolute: true,
    onlyFiles: true,
  });

  let chunks = 0;
  for (const file of files) {
    const rel = path.relative(docsRoot, file).replaceAll("\\", "/");
    const raw = await fs.readFile(file, "utf8");
    const title =
      raw
        .split("\n")
        .find((line) => line.startsWith("# "))
        ?.replace(/^#\s+/, "")
        .trim() ?? rel;
    const parts = chunkDocument(raw);
    parts.forEach((text, index) => {
      const tokens = tokenize(text);
      const termFreq: Record<string, number> = {};
      for (const token of tokens) termFreq[token] = (termFreq[token] ?? 0) + 1;
      const id = `rag:${rel}#${index}`;
      cache.set(id, {
        id,
        docId: rel,
        docTitle: title,
        sourcePath: rel,
        chunkIndex: index,
        text,
        tokens,
        termFreq,
      });
      chunks += 1;
    });
  }

  return { docs: files.length, chunks };
}

export function searchKv(
  cache: KvCache<RagChunk>,
  query: string,
  limit = 4,
): RankedChunk[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];

  const df: Record<string, number> = {};
  const entries = cache.values();
  for (const entry of entries) {
    const seen = new Set(entry.value.tokens);
    for (const token of seen) df[token] = (df[token] ?? 0) + 1;
  }

  const n = entries.length || 1;
  const scored: RankedChunk[] = [];
  for (const entry of entries) {
    const chunk = entry.value;
    let score = 0;
    for (const token of qTokens) {
      const tf = chunk.termFreq[token] ?? 0;
      if (!tf) continue;
      const idf = Math.log(1 + n / (1 + (df[token] ?? 0)));
      score += (1 + Math.log(tf)) * idf;
    }
    if (score > 0) scored.push({ chunk, score });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
