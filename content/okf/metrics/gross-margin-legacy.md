---
type: Metric
title: Gross Margin (Legacy)
description: Deprecated pre-FY2026 gross margin = revenue minus product cost only. Kept for historical reproducibility.
tags: [finance, margin, historical]
status: deprecated
stale_after: 2026-02-01T00:00:00Z
generated:
  by: curator_agent/demo-1.0
  at: 2026-06-30T14:00:00Z
sources:
  - id: margin-standard
    resource: policies/cost-allocation-standard.md
    title: Cost Allocation & Margin Standard (FY2026)
    author: human:finance-vp@northstar
    last_modified: 2026-06-15T00:00:00Z
---

# Definition (do not use for board reporting)

```
gross_margin_legacy(period) = revenue(period) - product_cost(period)
```

This definition excludes inbound fulfillment, outbound shipping, and payment fees. It remains available so historical dashboards can reproduce pre-2026 numbers. Prefer [`gross-margin`](./gross-margin.md) for any current decision.
