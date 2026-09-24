---
type: Reference
title: Cost Allocation & Margin Standard (FY2026)
description: Defines full COGS for gross margin — product cost, inbound fulfillment, outbound shipping, and payment fees.
tags: [finance, policy, margin]
status: stable
stale_after: 2026-12-31T00:00:00Z
verified:
  - by: human:finance-vp@northstar
    at: 2026-06-15T00:00:00Z
---

# Full COGS components

1. **Product cost** — from the products dimension
2. **Inbound fulfillment** — receiving and putaway allocated per unit
3. **Outbound shipping** — carrier invoice amounts for delivered parcels
4. **Payment fees** — processor fees net of refunds

Board-facing [`metrics/gross-margin`](../metrics/gross-margin.md) MUST use all four components. The legacy product-cost-only formula is deprecated.
