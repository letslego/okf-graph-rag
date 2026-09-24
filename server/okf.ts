export type TrustTier = "unverified" | "machine-confirmed" | "human-reviewed";

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
  frontmatter: Record<string, unknown>;
  body: string;
  raw: string;
  links: string[];
  trustTier: TrustTier;
  layers: {
    identity: Record<string, unknown>;
    provenance: unknown;
    trust: unknown;
    lifecycle: Record<string, unknown>;
    computation: unknown;
  };
};

export type OkfEdge = {
  from: string;
  to: string;
  label: string;
};

export type OkfGraph = {
  concepts: Map<string, OkfConcept>;
  edges: OkfEdge[];
};

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import fg from "fast-glob";

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

export async function loadOkfBundle(bundleRoot: string): Promise<OkfGraph> {
  const files = await fg("**/*.md", {
    cwd: bundleRoot,
    absolute: true,
    onlyFiles: true,
  });

  const concepts = new Map<string, OkfConcept>();
  const edges: OkfEdge[] = [];

  for (const file of files) {
    const rel = path.relative(bundleRoot, file).replaceAll("\\", "/");
    const base = path.basename(rel);
    if (base === "index.md" || base === "log.md") continue;

    const raw = await fs.readFile(file, "utf8");
    const parsed = matter(raw);
    const id = rel.replace(/\.md$/i, "");
    const data = parsed.data as Record<string, unknown>;
    const type = String(data.type ?? "Concept");
    const title = String(data.title ?? titleFromId(id));
    const description = String(data.description ?? "");
    const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
    const status = String(data.status ?? "stable");
    const staleAfter = data.stale_after ? String(data.stale_after) : null;
    const resource = data.resource ? String(data.resource) : null;
    const links = extractLinks(parsed.content, id);
    const trustTier = deriveTrustTier(data);

    concepts.set(id, {
      id,
      path: rel,
      type,
      title,
      description,
      tags,
      status,
      staleAfter,
      resource,
      frontmatter: data,
      body: parsed.content.trim(),
      raw,
      links,
      trustTier,
      layers: {
        identity: {
          type,
          title,
          description,
          resource,
          tags,
        },
        provenance: data.sources ?? null,
        trust: {
          generated: data.generated ?? null,
          verified: data.verified ?? null,
          trustTier,
        },
        lifecycle: {
          status,
          stale_after: staleAfter,
          not: data.not ?? null,
        },
        computation:
          type === "Attested Computation"
            ? {
                executor: data.executor ?? null,
                attester: data.attester ?? null,
                parameters: data.parameters ?? null,
              }
            : null,
      },
    });
  }

  for (const concept of concepts.values()) {
    for (const link of concept.links) {
      if (concepts.has(link)) {
        edges.push({ from: concept.id, to: link, label: "references" });
      }
    }
  }

  return { concepts, edges };
}

function titleFromId(id: string): string {
  const leaf = id.split("/").pop() ?? id;
  return leaf
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractLinks(body: string, fromId: string): string[] {
  const dir = path.posix.dirname(fromId);
  const found = new Set<string>();
  for (const match of body.matchAll(LINK_RE)) {
    const target = match[2];
    if (!target || target.startsWith("http") || target.startsWith("#")) continue;
    const cleaned = target.split("#")[0].replace(/^\.\//, "");
    if (!cleaned.endsWith(".md")) continue;
    const resolved = path.posix
      .normalize(path.posix.join(dir === "." ? "" : dir, cleaned))
      .replace(/^\.\//, "")
      .replace(/\.md$/i, "");
    if (resolved && resolved !== fromId) found.add(resolved);
  }
  return [...found];
}

function deriveTrustTier(data: Record<string, unknown>): TrustTier {
  const verified = data.verified;
  if (Array.isArray(verified) && verified.length > 0) {
    const human = verified.some((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const by = String((entry as { by?: string }).by ?? "");
      return by.startsWith("human:");
    });
    return human ? "human-reviewed" : "machine-confirmed";
  }
  if (data.generated) return "machine-confirmed";
  return "unverified";
}

export function serializeGraph(graph: OkfGraph) {
  return {
    nodes: [...graph.concepts.values()].map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      description: c.description,
      status: c.status,
      trustTier: c.trustTier,
      tags: c.tags,
    })),
    edges: graph.edges,
  };
}
