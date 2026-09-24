import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { KvCache } from "./kv.js";
import { loadOkfBundle, serializeGraph, type OkfGraph } from "./okf.js";
import { answerQuery } from "./query.js";
import { ingestSourceDocs, type RagChunk } from "./rag.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Dev (tsx server/) → repo root; prod (dist/server/) → repo root
const root = path.resolve(__dirname, path.basename(__dirname) === "server" && !__dirname.includes(`${path.sep}dist${path.sep}`) ? ".." : "../..");
const contentRoot = path.join(root, "content");
const okfRoot = path.join(contentRoot, "okf");
const docsRoot = path.join(contentRoot, "source-docs");
const webDist = path.join(root, "dist", "web");

const kv = new KvCache<RagChunk>();
let graph: OkfGraph = { concepts: new Map(), edges: [] };

async function boot() {
  const ingested = await ingestSourceDocs(docsRoot, kv);
  graph = await loadOkfBundle(okfRoot);
  console.log(
    `Ingested ${ingested.docs} docs → ${ingested.chunks} KV chunks; loaded ${graph.concepts.size} OKF concepts / ${graph.edges.length} edges`,
  );
}

const app = new Hono();
app.use("/api/*", cors());

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    kvChunks: kv.size(),
    okfConcepts: graph.concepts.size,
    okfEdges: graph.edges.length,
  }),
);

app.get("/api/overview", (c) =>
  c.json({
    product: "Northstar Commerce — OKF × Graph RAG",
    okfVersion: "0.2",
    usecases: [
      {
        id: "rag-kv",
        title: "Document RAG in KV cache",
        summary:
          "Unstructured ops memos and incident notes are chunked and stored in a key-value cache for lexical/semantic retrieval.",
      },
      {
        id: "okf-artifacts",
        title: "Curated OKF artifacts",
        summary:
          "Metrics, tables, policies, playbooks, and attested computations live as markdown + YAML frontmatter per Google OKF v0.2.",
      },
      {
        id: "hybrid",
        title: "Hybrid Graph RAG answers",
        summary:
          "A user query retrieves narrative snippets, expands the OKF concept graph, and filters by trust/lifecycle before synthesis.",
      },
    ],
    formats: [
      {
        field: "type",
        required: true,
        meaning: "Concept kind (Metric, Playbook, Attested Computation, …)",
      },
      {
        field: "sources / generated / verified",
        required: false,
        meaning: "Provenance and trust signals (OKF v0.2)",
      },
      {
        field: "status / stale_after",
        required: false,
        meaning: "Lifecycle and freshness",
      },
      {
        field: "executor / attester",
        required: false,
        meaning: "Attested Computation contract",
      },
    ],
    stats: {
      kvChunks: kv.size(),
      sourceDocs: new Set(kv.values().map((e) => e.value.docId)).size,
      okfConcepts: graph.concepts.size,
      okfEdges: graph.edges.length,
    },
  }),
);

app.get("/api/kv", (c) => c.json({ entries: kv.snapshot() }));

app.get("/api/kv/:key{.+}", (c) => {
  const key = decodeURIComponent(c.req.param("key"));
  const entry = kv.get(key);
  if (!entry) return c.json({ error: "not found" }, 404);
  return c.json(entry);
});

app.get("/api/okf", (c) => c.json(serializeGraph(graph)));

app.get("/api/okf/concepts", (c) => {
  const concepts = [...graph.concepts.values()].map((concept) => ({
    id: concept.id,
    type: concept.type,
    title: concept.title,
    description: concept.description,
    status: concept.status,
    trustTier: concept.trustTier,
    tags: concept.tags,
    path: concept.path,
  }));
  return c.json({ concepts });
});

app.get("/api/okf/concepts/:id{.+}", (c) => {
  const id = decodeURIComponent(c.req.param("id"));
  const concept = graph.concepts.get(id);
  if (!concept) return c.json({ error: "not found" }, 404);
  return c.json(concept);
});

app.get("/api/source-docs", async (c) => {
  const { default: fg } = await import("fast-glob");
  const files = await fg("**/*.{md,txt}", { cwd: docsRoot, onlyFiles: true });
  return c.json({ files });
});

app.get("/api/source-docs/:path{.+}", async (c) => {
  const rel = decodeURIComponent(c.req.param("path"));
  const fs = await import("node:fs/promises");
  try {
    const text = await fs.readFile(path.join(docsRoot, rel), "utf8");
    return c.json({ path: rel, text });
  } catch {
    return c.json({ error: "not found" }, 404);
  }
});

app.post("/api/query", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const query = String((body as { query?: string }).query ?? "").trim();
  if (!query) return c.json({ error: "query required" }, 400);
  return c.json(answerQuery(query, graph, kv));
});

app.get("/api/demo-queries", (c) =>
  c.json({
    queries: [
      "How should we compute gross margin for the board pack?",
      "Why did shipping costs spike in Q3 and how does that affect margin?",
      "Which table holds delivered orders and how does revenue recognition work?",
      "What is wrong with using product-cost-only gross margin in BI?",
    ],
  }),
);

app.use("/*", serveStatic({ root: webDist }));
app.get("*", async (c) => {
  try {
    const fs = await import("node:fs/promises");
    const html = await fs.readFile(path.join(webDist, "index.html"), "utf8");
    return c.html(html);
  } catch {
    return c.text(
      "Frontend not built yet. Run `npm run build` or `npm run dev`.",
      503,
    );
  }
});

const port = Number(process.env.PORT ?? 8080);

await boot();
serve({ fetch: app.fetch, port }, () => {
  console.log(`OKF × Graph RAG listening on :${port}`);
});
