export type TrustTier = "unverified" | "machine-confirmed" | "human-reviewed";

export type OkfLayers = {
  identity: Record<string, unknown>;
  provenance: unknown;
  trust: unknown;
  lifecycle: Record<string, unknown>;
  computation: unknown;
};

export type OkfConcept = {
  id: string;
  path: string;
  type: string;
  title: string;
  description: string;
  tags: string[];
  status: string;
  staleAfter: string | null;
  resource: string | null;
  body: string;
  raw: string;
  links: string[];
  trustTier: TrustTier;
  layers: OkfLayers;
};

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
    layers: OkfLayers;
    bodySnippet: string;
    rawSnippet: string;
  }>;
  graphPath: Array<{ from: string; to: string }>;
};

const STOP = new Set([
  "the","a","an","and","or","to","of","in","for","on","is","are","was","were","be","as","by","with","that","this","it","from","at","we","our","you","your",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function searchChunks(chunks: RagChunk[], query: string, limit = 4) {
  const qTokens = tokenize(query);
  if (!qTokens.length) return [] as Array<{ chunk: RagChunk; score: number }>;
  const df: Record<string, number> = {};
  for (const chunk of chunks) {
    for (const token of new Set(chunk.tokens)) df[token] = (df[token] ?? 0) + 1;
  }
  const n = chunks.length || 1;
  const scored: Array<{ chunk: RagChunk; score: number }> = [];
  for (const chunk of chunks) {
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

export function answerQuery(
  query: string,
  concepts: OkfConcept[],
  edges: Array<{ from: string; to: string; label: string }>,
  chunks: RagChunk[],
): QueryResult {
  const pipeline: Array<{ step: string; detail: string }> = [];
  const ragHits = searchChunks(chunks, query, 4);
  pipeline.push({
    step: "1. RAG over KV cache",
    detail: `Scored ${chunks.length} chunks; kept top ${ragHits.length} narrative snippets.`,
  });

  const byId = new Map(concepts.map((c) => [c.id, c]));
  const conceptScores = new Map<string, { score: number; why: string }>();

  for (const concept of concepts) {
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

  for (const hit of ragHits) {
    const text = hit.chunk.text.toLowerCase();
    for (const concept of concepts) {
      const title = concept.title.toLowerCase();
      if (title.length > 3 && text.includes(title)) {
        const prev = conceptScores.get(concept.id);
        conceptScores.set(concept.id, {
          score: (prev?.score ?? 0) + 2.5 + hit.score * 0.1,
          why: prev
            ? `${prev.why}; reinforced by RAG snippet from ${hit.chunk.docTitle}`
            : `Reinforced by RAG snippet from ${hit.chunk.docTitle}`,
        });
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
    for (const edge of edges) {
      if (edge.from === seed || edge.to === seed) {
        const other = edge.from === seed ? edge.to : edge.from;
        if (!expanded.has(other)) {
          expanded.add(other);
          graphPath.push({ from: seed, to: other });
          if (!conceptScores.has(other)) {
            conceptScores.set(other, { score: 1, why: `Graph expansion from ${seed}` });
          }
        }
      }
    }
  }

  pipeline.push({
    step: "3. Graph expansion",
    detail: `Walked OKF markdown links from seed concepts; added ${graphPath.length} edges of curated context.`,
  });

  const selected = [...expanded]
    .map((id) => ({
      concept: byId.get(id)!,
      meta: conceptScores.get(id) ?? { score: 0, why: "graph neighbor" },
    }))
    .filter((x) => x.concept)
    .sort((a, b) => b.meta.score - a.meta.score)
    .slice(0, 6);

  const filtered = selected.filter((item) => {
    if (item.concept.status !== "deprecated") return true;
    return !selected.some(
      (other) =>
        other.concept.status === "stable" &&
        other.concept.type === item.concept.type &&
        other.concept.title.replace(/\s*\(legacy\)/i, "") ===
          item.concept.title.replace(/\s*\(legacy\)/i, ""),
    );
  });

  pipeline.push({
    step: "4. Trust & lifecycle filter",
    detail:
      "Down-ranked deprecated concepts when a stable verified sibling exists; surfaced provenance and stale_after signals.",
  });

  const metric = filtered.find((c) => c.concept.type === "Metric")?.concept;
  const computation = filtered.find((c) => c.concept.type === "Attested Computation")?.concept;
  const playbook = filtered.find((c) => c.concept.type === "Playbook")?.concept;
  const table = filtered.find((c) => c.concept.type === "BigQuery Table")?.concept;
  const policy = filtered.find((c) => c.concept.type === "Reference")?.concept;

  const lines: string[] = ["## Answer", ""];
  if (metric) {
    lines.push(
      `For **${metric.title}**, use the curated OKF concept \`${metric.id}\` (${metric.trustTier}, status \`${metric.status}\`).`,
    );
    if (metric.description) lines.push(metric.description);
    if ((metric.layers.lifecycle as { not?: unknown }).not) {
      lines.push(
        `Do **not** use the legacy product-cost-only definition; full COGS is required by the FY2026 standard.`,
      );
    }
  } else if (filtered[0]) {
    lines.push(
      `Top OKF grounding: **${filtered[0].concept.title}** (\`${filtered[0].concept.id}\`, ${filtered[0].concept.trustTier}).`,
    );
    if (filtered[0].concept.description) lines.push(filtered[0].concept.description);
  } else {
    lines.push("No strong OKF concept matched; falling back to narrative RAG snippets only.");
  }
  if (computation) {
    lines.push("");
    lines.push(
      `Compute it via the attested computation \`${computation.id}\` rather than improvising SQL.`,
    );
  }
  if (policy) lines.push(`Policy source of truth: \`${policy.id}\`.`);
  if (playbook) lines.push(`Operational playbook: \`${playbook.id}\`.`);
  if (table) {
    lines.push(`Primary table grounding: \`${table.id}\` (${table.resource ?? "n/a"}).`);
  }
  if (ragHits[0]) {
    lines.push("");
    lines.push("### Narrative context from KV-cached RAG");
    const compact = ragHits[0].chunk.text.replace(/\s+/g, " ").trim();
    lines.push(
      `Retrieved from **${ragHits[0].chunk.docTitle}**: ${compact.length > 280 ? `${compact.slice(0, 280)}…` : compact}`,
    );
  }
  lines.push("");
  lines.push(
    `_Query processed with hybrid Graph RAG: KV lexical retrieval + OKF link expansion + trust/lifecycle filters._`,
  );
  lines.push(`_User question: ${query}_`);

  pipeline.push({
    step: "5. Synthesize answer",
    detail:
      "Combined narrative snippets (RAG/KV) with curated OKF layers (identity, provenance, trust, lifecycle, computation).",
  });

  return {
    query,
    answer: lines.join("\n"),
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
