---
type: Metric
title: Revenue
description: Recognized revenue for a period, per Northstar's FY2026 revenue-recognition policy. Backed by an Attested Computation.
tags: [finance, revenue, headline-metric]
generated:
  by: curator_agent/demo-1.0
  at: 2026-06-30T14:00:00Z
verified:
  - by: human:finance-vp@northstar
    at: 2026-07-01T09:00:00Z
status: stable
stale_after: 2026-12-31T00:00:00Z
sources:
  - id: revenue-policy
    resource: policies/revenue-recognition.md
    title: Revenue Recognition Policy (FY2026)
    author: human:finance-vp@northstar
    last_modified: 2026-06-15T00:00:00Z
---

# Definition

Revenue for a fiscal period is the sum of `net_amount` over orders that (a) reached `order_status = 'delivered'`, (b) completed the 30-day return window, and (c) fall in the period by `order_ts`. Multi-currency orders are converted to USD at the `order_ts` daily reference rate.

The sanctioned computation is [`computations/revenue-period.md`](../computations/revenue-period.md). Consumers MUST run and attest that computation rather than composing their own `SUM`.

# Reporting cuts

- **By fiscal period:** the sanctioned computation takes `period_start` and `period_end`.
- **By channel or category:** join the receipt's row-level result to [`tables/orders`](../tables/orders.md) channel fields or to order lines × products client-side. Do NOT rewrite the sanctioned SQL.

# Trust and freshness

- **Verified:** VP Finance sign-off on 2026-07-01.
- **Stale after 2026-12-31:** re-verify against the FY2027 policy before serving.
