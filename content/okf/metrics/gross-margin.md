---
type: Metric
title: Gross Margin
description: Gross margin for a period using full COGS (product cost + inbound fulfillment + outbound shipping + payment fees).
tags: [finance, margin, headline-metric]
generated:
  by: curator_agent/demo-1.0
  at: 2026-06-30T14:00:00Z
verified:
  - by: human:finance-vp@northstar
    at: 2026-07-01T09:00:00Z
status: stable
stale_after: 2026-12-31T00:00:00Z
not:
  - term: "revenue minus product cost only"
    why: "that is the pre-FY2026 definition (see gross-margin-legacy). It excluded fulfillment, shipping, and payment fees."
    instead: "revenue minus full COGS"
sources:
  - id: margin-standard
    resource: policies/cost-allocation-standard.md
    title: Cost Allocation & Margin Standard (FY2026)
    author: human:finance-vp@northstar
    last_modified: 2026-06-15T00:00:00Z
  - id: revenue-policy
    resource: policies/revenue-recognition.md
    title: Revenue Recognition Policy (FY2026)
    author: human:finance-vp@northstar
    last_modified: 2026-06-15T00:00:00Z
---

# Definition

**Not:** revenue minus product cost only (that was the pre-2026 formula; see [`gross-margin-legacy`](./gross-margin-legacy.md)).

Gross margin for a period equals recognized [Revenue](./revenue.md) minus **full COGS**, where full COGS is the sum of product cost, inbound fulfillment cost, outbound shipping cost, and payment processing fees.

```
gross_margin(period) = revenue(period) - cogs_full(period)
```

The sanctioned computation is [`computations/gross-margin-period.md`](../computations/gross-margin-period.md).

# What changed in FY2026

Prior to 2026-02-01, Northstar's gross-margin definition included only product cost. The switch reduced reported gross margin by roughly 4–6 percentage points depending on category and closed the ledger reconciliation gap. Ops memos and BI explores that still use product-cost-only must be treated as historical.

# Related operational context

Outbound shipping spikes (for example Q3 carrier surge fees) flow into full COGS and therefore into this metric. See the [`playbooks/carrier-reconciliation`](../playbooks/carrier-reconciliation.md) concept and the RAG-ingested Q3 fulfillment ops review.
