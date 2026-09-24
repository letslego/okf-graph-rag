import "./styles.css";
import corpus from "./corpus.json";
import { answerQuery, type OkfConcept, type QueryResult, type RagChunk } from "./lib/query-engine";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app missing");

const chunks = corpus.chunks as RagChunk[];
const concepts = corpus.concepts as OkfConcept[];
const edges = corpus.edges as Array<{ from: string; to: string; label: string }>;
const sourceDocs = corpus.sourceDocs as Record<string, string>;

app.innerHTML = `
  <div class="shell">
    <header class="site-header">
      <div class="brand">Northstar <span>OKF × Graph RAG</span></div>
      <nav class="nav">
        <a href="#usecases">Use cases</a>
        <a href="#formats">OKF formats</a>
        <a href="#demo">Live query</a>
        <a href="#artifacts">Artifacts</a>
      </nav>
    </header>

    <section class="hero" id="top">
      <div class="hero-visual" aria-hidden="true"></div>
      <div class="hero-copy">
        <h1>Northstar<br /><em>OKF × Graph RAG</em></h1>
        <p>
          Curated Google Open Knowledge Format concepts and narrative documents in a KV cache —
          answered together through graph-aware retrieval.
        </p>
        <div class="cta-row">
          <a class="btn btn-primary" href="#demo">Try a hybrid query</a>
          <a class="btn btn-ghost" href="#formats">Inspect OKF layers</a>
        </div>
      </div>
    </section>

    <section id="usecases">
      <p class="section-kicker">Use cases</p>
      <h2>Three layers, one answer path</h2>
      <p class="lede">
        Unstructured ops prose fuels recall. OKF grounds definitions, trust, and attested computations.
        Graph expansion stitches them into answers agents can defend.
      </p>
      <div class="usecase-list" id="usecase-list"></div>
      <div class="stats" id="stats" style="margin-top:2rem"></div>
    </section>

    <section id="formats">
      <p class="section-kicker">OKF v0.2</p>
      <h2>Formats that travel with the knowledge</h2>
      <p class="lede">
        Each concept is a UTF-8 markdown file with YAML frontmatter. <code>type</code> is the only
        required field; provenance, trust, lifecycle, and attestation are optional but meaningful when present.
      </p>
      <table class="format-table" id="format-table">
        <thead>
          <tr><th>Field</th><th>Required</th><th>Meaning</th></tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>

    <section id="demo">
      <p class="section-kicker">Live demo</p>
      <h2>Ask with RAG + OKF together</h2>
      <p class="lede">
        Submit a question. Watch the pipeline retrieve KV snippets, rank OKF concepts, expand the link graph,
        and synthesize an answer with both layers visible.
      </p>
      <div class="demo-panel">
        <div class="demo-input">
          <textarea id="query-input" placeholder="Ask about gross margin, shipping costs, revenue recognition…"></textarea>
          <div class="chips" id="query-chips"></div>
          <div class="cta-row">
            <button class="btn btn-primary" id="run-query">Run hybrid query</button>
            <span class="loading" id="query-status" hidden>Retrieving…</span>
          </div>
        </div>
        <div id="query-result"></div>
      </div>
    </section>

    <section id="artifacts">
      <p class="section-kicker">Browse</p>
      <h2>Original artifacts &amp; OKF concepts</h2>
      <p class="lede">
        Compare a source document chunked into the KV cache with the curated OKF concept it should ground against —
        including frontmatter layers.
      </p>
      <div class="artifacts-grid">
        <div>
          <h3>Source documents (RAG)</h3>
          <select id="doc-select"></select>
          <pre class="snippet artifact-pane" id="doc-view"></pre>
        </div>
        <div>
          <h3>OKF concepts</h3>
          <select id="okf-select"></select>
          <div id="okf-view" class="artifact-pane"></div>
        </div>
      </div>
    </section>

    <footer class="site-footer">
      <p>
        Demo of <a href="https://github.com/GoogleCloudPlatform/open-knowledge-format" target="_blank" rel="noreferrer">Google Open Knowledge Format</a>
        combined with Graph RAG. Sample domain: Northstar Commerce retail analytics.
        Runs fully in your browser from the published corpus.
      </p>
    </footer>
  </div>
`;

function renderMarkdownLite(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "<br/><br/>");
}

function layerBlock(title: string, value: unknown): string {
  if (value == null) return "";
  return `<details class="layer" open>
    <summary>${title}</summary>
    <pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>
  </details>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderResult(result: QueryResult): string {
  const rag = result.ragHits
    .map(
      (hit) => `
      <article class="snippet">
        <header>
          <strong>${escapeHtml(hit.docTitle)}</strong>
          <span class="meta">score ${hit.score} · ${escapeHtml(hit.sourcePath)}</span>
        </header>
        <pre>${escapeHtml(hit.snippet)}</pre>
      </article>`,
    )
    .join("");

  const okf = result.okfConcepts
    .map((concept) => {
      const statusClass = concept.status === "deprecated" ? "warn" : "good";
      return `
      <article class="snippet">
        <header>
          <strong>${escapeHtml(concept.title)}</strong>
          <span class="meta">${escapeHtml(concept.id)}</span>
        </header>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.55rem">
          <span class="badge">${escapeHtml(concept.type)}</span>
          <span class="badge ${statusClass}">${escapeHtml(concept.status)}</span>
          <span class="badge good">${escapeHtml(concept.trustTier)}</span>
        </div>
        <p class="muted" style="margin:0 0 0.6rem;font-size:0.9rem">${escapeHtml(concept.why)}</p>
        <div class="layers">
          ${layerBlock("Identity", concept.layers.identity)}
          ${layerBlock("Provenance", concept.layers.provenance)}
          ${layerBlock("Trust", concept.layers.trust)}
          ${layerBlock("Lifecycle", concept.layers.lifecycle)}
          ${layerBlock("Computation", concept.layers.computation)}
          <details class="layer">
            <summary>Original artifact snippet</summary>
            <pre>${escapeHtml(concept.rawSnippet)}</pre>
          </details>
        </div>
      </article>`;
    })
    .join("");

  const pipeline = result.pipeline
    .map(
      (step, i) => `
      <div class="pipeline-step">
        <div class="step-index">${i + 1}</div>
        <div>
          <strong>${escapeHtml(step.step.replace(/^\d+\.\s*/, ""))}</strong>
          <span>${escapeHtml(step.detail)}</span>
        </div>
      </div>`,
    )
    .join("");

  const graph = result.graphPath
    .map(
      (edge) =>
        `<div class="graph-node"><code>${escapeHtml(edge.from)}</code> → <code>${escapeHtml(edge.to)}</code></div>`,
    )
    .join("");

  return `
    <div class="stack" style="margin-top:1rem">
      <div class="pane">
        <h3>Synthesized answer</h3>
        <div class="answer">${renderMarkdownLite(result.answer)}</div>
      </div>
      <div class="pane">
        <h3>Retrieval pipeline</h3>
        <div class="pipeline">${pipeline}</div>
      </div>
      <div class="pane">
        <h3>Graph expansion</h3>
        <div class="graph">${graph || '<span class="muted">No extra edges expanded for this query.</span>'}</div>
      </div>
      <div class="split">
        <div class="pane">
          <h3>RAG snippets (KV cache)</h3>
          ${rag || '<p class="muted">No chunks matched.</p>'}
        </div>
        <div class="pane">
          <h3>OKF concepts &amp; layers</h3>
          ${okf || '<p class="muted">No concepts matched.</p>'}
        </div>
      </div>
    </div>
  `;
}

function init() {
  const usecases = [
    {
      title: "Document RAG in KV cache",
      summary:
        "Unstructured ops memos and incident notes are chunked and stored in a key-value cache for lexical/semantic retrieval.",
    },
    {
      title: "Curated OKF artifacts",
      summary:
        "Metrics, tables, policies, playbooks, and attested computations live as markdown + YAML frontmatter per Google OKF v0.2.",
    },
    {
      title: "Hybrid Graph RAG answers",
      summary:
        "A user query retrieves narrative snippets, expands the OKF concept graph, and filters by trust/lifecycle before synthesis.",
    },
  ];

  const formats = [
    { field: "type", required: true, meaning: "Concept kind (Metric, Playbook, Attested Computation, …)" },
    { field: "sources / generated / verified", required: false, meaning: "Provenance and trust signals (OKF v0.2)" },
    { field: "status / stale_after", required: false, meaning: "Lifecycle and freshness" },
    { field: "executor / attester", required: false, meaning: "Attested Computation contract" },
  ];

  document.querySelector("#usecase-list")!.innerHTML = usecases
    .map(
      (u) => `
      <article class="usecase">
        <h3>${escapeHtml(u.title)}</h3>
        <p>${escapeHtml(u.summary)}</p>
      </article>`,
    )
    .join("");

  document.querySelector("#stats")!.innerHTML = `
    <div><strong>${corpus.stats.sourceDocs}</strong>source docs</div>
    <div><strong>${corpus.stats.kvChunks}</strong>KV chunks</div>
    <div><strong>${corpus.stats.okfConcepts}</strong>OKF concepts</div>
    <div><strong>${corpus.stats.okfEdges}</strong>graph edges</div>
  `;

  document.querySelector("#format-table tbody")!.innerHTML = formats
    .map(
      (f) => `
      <tr>
        <td><code>${escapeHtml(f.field)}</code></td>
        <td>${f.required ? "yes" : "optional"}</td>
        <td>${escapeHtml(f.meaning)}</td>
      </tr>`,
    )
    .join("");

  const input = document.querySelector<HTMLTextAreaElement>("#query-input")!;
  const chips = document.querySelector("#query-chips")!;
  chips.innerHTML = corpus.demoQueries
    .map((q) => `<button type="button" class="chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`)
    .join("");

  chips.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLButtonElement)) return;
    input.value = target.dataset.q ?? "";
    chips.querySelectorAll(".chip").forEach((el) => el.classList.toggle("active", el === target));
  });

  const status = document.querySelector<HTMLSpanElement>("#query-status")!;
  const resultRoot = document.querySelector("#query-result")!;
  const run = () => {
    const query = input.value.trim();
    if (!query) return;
    status.hidden = false;
    try {
      const result = answerQuery(query, concepts, edges, chunks);
      resultRoot.innerHTML = renderResult(result);
    } catch (error) {
      resultRoot.innerHTML = `<p class="muted">Query failed: ${escapeHtml(String(error))}</p>`;
    } finally {
      status.hidden = true;
    }
  };

  document.querySelector("#run-query")!.addEventListener("click", run);

  const docSelect = document.querySelector<HTMLSelectElement>("#doc-select")!;
  const docView = document.querySelector("#doc-view")!;
  const docFiles = Object.keys(sourceDocs).sort();
  docSelect.innerHTML = docFiles
    .map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`)
    .join("");
  const loadDoc = () => {
    docView.textContent = sourceDocs[docSelect.value] ?? "";
  };
  docSelect.addEventListener("change", loadDoc);
  loadDoc();

  const okfSelect = document.querySelector<HTMLSelectElement>("#okf-select")!;
  const okfView = document.querySelector("#okf-view")!;
  okfSelect.innerHTML = concepts
    .map(
      (c) =>
        `<option value="${escapeHtml(c.id)}">${escapeHtml(c.type)} — ${escapeHtml(c.title)}</option>`,
    )
    .join("");
  const loadOkf = () => {
    const concept = concepts.find((c) => c.id === okfSelect.value);
    if (!concept) return;
    okfView.innerHTML = `
      <div class="snippet">
        <header>
          <strong>${escapeHtml(concept.title)}</strong>
          <span class="meta">${escapeHtml(concept.id)}</span>
        </header>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.55rem">
          <span class="badge">${escapeHtml(concept.type)}</span>
          <span class="badge ${concept.status === "deprecated" ? "warn" : "good"}">${escapeHtml(concept.status)}</span>
          <span class="badge good">${escapeHtml(concept.trustTier)}</span>
        </div>
        <div class="layers">
          ${layerBlock("Identity", concept.layers.identity)}
          ${layerBlock("Provenance", concept.layers.provenance)}
          ${layerBlock("Trust", concept.layers.trust)}
          ${layerBlock("Lifecycle", concept.layers.lifecycle)}
          ${layerBlock("Computation", concept.layers.computation)}
          <details class="layer" open>
            <summary>Full artifact</summary>
            <pre>${escapeHtml(concept.raw)}</pre>
          </details>
        </div>
      </div>`;
  };
  okfSelect.addEventListener("change", loadOkf);
  const preferred = concepts.find((c) => c.id === "metrics/gross-margin");
  if (preferred) okfSelect.value = preferred.id;
  loadOkf();

  input.value = corpus.demoQueries[0] ?? "";
}

init();
