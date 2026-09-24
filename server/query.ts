import type { KvCache } from "./kv.js";
import type { OkfConcept, OkfGraph } from "./okf.js";
import { searchKv, tokenize, type RagChunk } from "./rag.js";

export type QueryResult = {
  query: string;
  answer: string;
  pipeline: Array<{ step: string; detail: string }>;
  ragHits: Array<{
    id: string;
    docTitle: string;
    sourcePath: string;
    score: number;
    snippet: string;
  }>;
  okfConcepts: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    trustTier: string;
    why: string;
    layers: OkfConcept["layers"];
    bodySnippet: string;
    rawSnippet: string;
  }>;
  graphPath: Array<{ from: string; to: string }>;
};

export function answerQuery(
  query: string,
  graph: OkfGraph,
  cache: KvCache<RagChunk>,
): QueryResult {
  const pipeline: Array<{ step: string; detail: string }> = [];
  const ragHits = searchKv(cache, query, 4);
  pipeline.push({
    step: "1. RAG over KV cache",
    detail: `Scored ${cache.size()} chunks; kept top ${ragHits.length} narrative snippets.`,
  });

  const conceptScores = new Map<string, { score: number; why: string }>();

  for (const concept of graph.concepts.values()) {
    const hay = tokenize(
      `${concept.title} ${concept.description} ${concept.body} ${concept.tags.join(" ")} ${concept.type}`,
    );
    const q = new Set(tokenize(query));
    let overlap = 0;
    for (const token of hay) if (q.has(token)) overlap += 1;
    if (overlap > 0) {
      let score = overlap;
      if (concept.trustTier === "human-reviewed") score += 2;
      if (concept.status === "stable") score += 1;
      if (concept.status === "deprecated") score -= 3;
      conceptScores.set(concept.id, {
        score,
        why: `Lexical overlap with query (${overlap} tokens)`,
      });
    }
  }

  // Bridge: if RAG mentions a known metric/table phrase, boost linked OKF nodes
  for (const hit of ragHits) {
    const text = hit.chunk.text.toLowerCase();
    for (const concept of graph.concepts.values()) {
      const title = concept.title.toLowerCase();
      if (title.length > 3 && text.includes(title.toLowerCase())) {
        const prev = conceptScores.get(concept.id);
        conceptScores.set(concept.id, {
          score: (prev?.score ?? 0) + 2.5 + hit.score * 0.1,
          why: prev
            ? `${prev.why}; reinforced by RAG snippet from ${hit.chunk.docTitle}`
            : `Reinforced by RAG snippet from ${hit.chunk.docTitle}`,
        });
      }
      for (const tag of concept.tags) {
        if (text.includes(tag.toLowerCase())) {
          const prev = conceptScores.get(concept.id);
          conceptScores.set(concept.id, {
            score: (prev?.score ?? 0) + 0.4,
            why: prev?.why ?? `Tag '${tag}' seen in RAG context`,
          });
        }
      }
    }
  }

  pipeline.push({
    step: "2. OKF concept ranking",
    detail: `Ranked ${conceptScores.size} concepts using lexical overlap, trust tier, and RAG reinforcement.`,
  });

  const seedIds = [...conceptScores.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3)
    .map(([id]) => id);

  const expanded = new Set(seedIds);
  const graphPath: Array<{ from: string; to: string }> = [];
  for (const seed of seedIds) {
    for (const edge of graph.edges) {
      if (edge.from === seed || edge.to === seed) {
        const other = edge.from === seed ? edge.to : edge.from;
        if (!expanded.has(other)) {
          expanded.add(other);
          graphPath.push({ from: seed, to: other });
          if (!conceptScores.has(other)) {
            conceptScores.set(other, {
              score: 1,
              why: `Graph expansion from ${seed}`,
            });
          }
        }
      }
    }
  }

  pipeline.push({
    step: "3. Graph expansion",
    detail: `Walked OKF markdown links from seed concepts; added ${graphPath.length} edges of curated context (policies, computations, tables).`,
  });

  const selected = [...expanded]
    .map((id) => ({
      concept: graph.concepts.get(id)!,
      meta: conceptScores.get(id) ?? { score: 0, why: "graph neighbor" },
    }))
    .filter((x) => x.concept)
    .sort((a, b) => b.meta.score - a.meta.score)
    .slice(0, 6);

  // Prefer stable human-reviewed metrics when deprecated siblings also match
  const filtered = selected.filter((item) => {
    if (item.concept.status !== "deprecated") return true;
    const hasStableSibling = selected.some(
      (other) =>
        other.concept.status === "stable" &&
        other.concept.type === item.concept.type &&
        other.concept.title.replace(/\s*\(legacy\)/i, "") ===
          item.concept.title.replace(/\s*\(legacy\)/i, ""),
    );
    return !hasStableSibling;
  });

  pipeline.push({
    step: "4. Trust & lifecycle filter",
    detail:
      "Down-ranked deprecated concepts when a stable verified sibling exists; surfaced provenance and stale_after signals.",
  });

  const answer = synthesizeAnswer(query, ragHits, filtered);

  pipeline.push({
    step: "5. Synthesize answer",
    detail:
      "Combined narrative snippets (RAG/KV) with curated OKF layers (identity, provenance, trust, lifecycle, computation).",
  });

  return {
    query,
    answer,
    pipeline,
    ragHits: ragHits.map((hit) => ({
      id: hit.chunk.id,
      docTitle: hit.chunk.docTitle,
      sourcePath: hit.chunk.sourcePath,
      score: Number(hit.score.toFixed(3)),
      snippet: hit.chunk.text.slice(0, 420),
    })),
    okfConcepts: filtered.map(({ concept, meta }) => ({
      id: concept.id,
      title: concept.title,
      type: concept.type,
      status: concept.status,
      trustTier: concept.trustTier,
      why: meta.why,
      layers: concept.layers,
      bodySnippet: concept.body.slice(0, 500),
      rawSnippet: concept.raw.slice(0, 700),
    })),
    graphPath,
  };
}

function synthesizeAnswer(
  query: string,
  ragHits: ReturnType<typeof searchKv>,
  concepts: Array<{ concept: OkfConcept; meta: { score: number; why: string } }>,
): string {
  const metric = concepts.find((c) => c.concept.type === "Metric")?.concept;
  const computation = concepts.find(
    (c) => c.concept.type === "Attested Computation",
  )?.concept;
  const playbook = concepts.find((c) => c.concept.type === "Playbook")?.concept;
  const table = concepts.find((c) => c.concept.type === "BigQuery Table")
    ?.concept;
  const policy = concepts.find((c) => c.concept.type === "Reference")?.concept;

  const lines: string[] = [];
  lines.push(`## Answer`);
  lines.push("");

  if (metric) {
    lines.push(
      `For **${metric.title}**, use the curated OKF concept \`${metric.id}\` (${metric.trustTier}, status \`${metric.status}\`).`,
    );
    if (metric.description) lines.push(metric.description);
    if (metric.layers.lifecycle && (metric.layers.lifecycle as { not?: unknown }).not) {
      lines.push(
        `Do **not** use the legacy product-cost-only definition; full COGS is required by the FY2026 standard.`,
      );
    }
  } else if (concepts[0]) {
    lines.push(
      `Top OKF grounding: **${concepts[0].concept.title}** (\`${concepts[0].concept.id}\`, ${concepts[0].concept.trustTier}).`,
    );
    if (concepts[0].concept.description) {
      lines.push(concepts[0].concept.description);
    }
  } else {
    lines.push(
      "No strong OKF concept matched; falling back to narrative RAG snippets only.",
    );
  }

  if (computation) {
    lines.push("");
    lines.push(
      `Compute it via the attested computation \`${computation.id}\` rather than improvising SQL.`,
    );
  }
  if (policy) {
    lines.push(`Policy source of truth: \`${policy.id}\`.`);
  }
  if (playbook) {
    lines.push(`Operational playbook: \`${playbook.id}\`.`);
  }
  if (table) {
    lines.push(`Primary table grounding: \`${table.id}\` (${table.resource ?? "n/a"}).`);
  }

  if (ragHits[0]) {
    lines.push("");
    lines.push(`### Narrative context from KV-cached RAG`);
    lines.push(
      `Retrieved from **${ragHits[0].chunk.docTitle}**: ${truncate(ragHits[0].chunk.text, 280)}`,
    );
  }

  lines.push("");
  lines.push(
    `_Query processed with hybrid Graph RAG: KV lexical retrieval + OKF link expansion + trust/lifecycle filters._`,
  );
  lines.push(`_User question: ${query}_`);
  return lines.join("\n");
}

function truncate(text: string, n: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > n ? `${compact.slice(0, n)}…` : compact;
}
