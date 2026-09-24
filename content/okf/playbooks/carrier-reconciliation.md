---
type: Playbook
title: Carrier Invoice Reconciliation
description: Weekly process to match carrier invoices to delivered parcels and book outbound shipping into full COGS.
tags: [ops, shipping, cogs]
status: stable
generated:
  by: curator_agent/demo-1.0
  at: 2026-09-01T12:00:00Z
verified:
  - by: human:ops-finance@northstar
    at: 2026-09-02T10:00:00Z
sources:
  - id: ops-review
    resource: ../source-docs/q3-fulfillment-ops-review.md
    title: Q3 Fulfillment Ops Review
---

# Steps

1. Ingest Carrier A/B invoice CSVs.
2. Match `tracking_id` to [`tables/orders`](../tables/orders.md) where `order_status = 'delivered'`.
3. Map surcharge codes (`OVN`, `WX`) to outbound shipping COGS — never marketing.
4. Feed reconciled amounts into [`computations/gross-margin-period`](../computations/gross-margin-period.md).

Q3 hurricane surge fees at the ATL hub are a known driver of elevated outbound shipping; treat them as COGS, not anomalies to exclude from margin.
