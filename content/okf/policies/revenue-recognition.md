---
type: Reference
title: Revenue Recognition Policy (FY2026)
description: Finance policy defining when order revenue may be recognized.
tags: [finance, policy]
status: stable
stale_after: 2026-12-31T00:00:00Z
verified:
  - by: human:finance-vp@northstar
    at: 2026-06-15T00:00:00Z
---

# Policy summary

Recognize revenue only after delivery and after the 30-day return window closes. Convert foreign currency at the daily reference rate on `order_ts`. Marketplace channel fees are netted before recognition when the marketplace is the merchant of record.

This policy backs the [`metrics/revenue`](../metrics/revenue.md) concept.
