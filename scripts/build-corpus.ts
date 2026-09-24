import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadOkfBundle } from "../server/okf.js";
import { ingestSourceDocs, type RagChunk } from "../server/rag.js";
import { KvCache } from "../server/kv.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = path.join(root, "content/source-docs");
const okfRoot = path.join(root, "content/okf");
const outPath = path.join(root, "src/corpus.json");

const kv = new KvCache<RagChunk>();
const ingested = await ingestSourceDocs(docsRoot, kv);
const graph = await loadOkfBundle(okfRoot);

const sourceDocs: Record<string, string> = {};
for (const file of await fs.readdir(docsRoot)) {
  if (!file.endsWith(".md") && !file.endsWith(".txt")) continue;
  sourceDocs[file] = await fs.readFile(path.join(docsRoot, file), "utf8");
}

const corpus = {
  generatedAt: new Date().toISOString(),
  stats: {
    sourceDocs: ingested.docs,
    kvChunks: ingested.chunks,
    okfConcepts: graph.concepts.size,
    okfEdges: graph.edges.length,
  },
  chunks: kv.values().map((e) => e.value),
  concepts: [...graph.concepts.values()].map((c) => ({
    id: c.id,
    path: c.path,
    type: c.type,
    title: c.title,
    description: c.description,
    tags: c.tags,
    status: c.status,
    staleAfter: c.staleAfter,
    resource: c.resource,
    frontmatter: c.frontmatter,
    body: c.body,
    raw: c.raw,
    links: c.links,
    trustTier: c.trustTier,
    layers: c.layers,
  })),
  edges: graph.edges,
  sourceDocs,
  demoQueries: [
    "How should we compute gross margin for the board pack?",
    "Why did shipping costs spike in Q3 and how does that affect margin?",
    "Which table holds delivered orders and how does revenue recognition work?",
    "What is wrong with using product-cost-only gross margin in BI?",
  ],
};

await fs.writeFile(outPath, JSON.stringify(corpus));
console.log(`Wrote ${outPath} (${ingested.chunks} chunks, ${graph.concepts.size} concepts)`);
