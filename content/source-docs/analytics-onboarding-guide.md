# Onboarding Guide — Asking Analytics Questions Safely

Welcome to Northstar Commerce analytics. Before you write SQL or trust a dashboard number, read this short guide.

## Prefer curated knowledge over improvisation

We maintain an Open Knowledge Format (OKF) bundle for headline metrics, tables, playbooks, and attested computations. OKF concepts are plain markdown files with YAML frontmatter. They record:

- What a concept means (`type`, `title`, `description`)
- Where it came from (`sources`)
- How much to trust it (`generated`, `verified`)
- Whether it is still current (`status`, `stale_after`)
- How to compute a number the blessed way (`type: Attested Computation`)

## Pair OKF with document RAG

Runbooks, incident notes, and ops reviews live as ordinary documents. Those are chunked, embedded, and stored in a key-value cache for semantic retrieval. When you ask a question:

1. RAG retrieves narrative snippets from the KV cache.
2. The OKF graph expands related concepts (metrics → policies → computations → tables).
3. The answer synthesizer cites both layers so you can see the original prose and the curated knowledge.

## Example questions that work well

- "How should we compute gross margin for the board pack?"
- "Why did shipping costs spike in Q3 and how does that affect margin?"
- "Which table holds delivered orders and what joins to products?"

If a concept is past `stale_after`, re-verify with Finance before publishing.
