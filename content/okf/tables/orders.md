---
type: BigQuery Table
title: Orders
description: Fact table of commerce orders including delivery status, amounts, channel, and tracking ids.
resource: bigquery://northstar-commerce/analytics/orders
tags: [orders, warehouse, fact]
generated:
  by: curator_agent/demo-1.0
  at: 2026-06-30T14:00:00Z
verified:
  - by: human:analytics-lead@northstar
    at: 2026-07-02T16:00:00Z
status: stable
stale_after: 2027-01-01T00:00:00Z
---

# Schema highlights

| Column | Type | Notes |
|--------|------|-------|
| `order_id` | STRING | Primary key |
| `order_ts` | TIMESTAMP | Order placed time (UTC) |
| `order_status` | STRING | `placed`, `shipped`, `delivered`, `returned` |
| `net_amount` | NUMERIC | Post-discount amount in order currency |
| `currency` | STRING | ISO currency code |
| `channel` | STRING | `web`, `app`, `marketplace` |
| `tracking_id` | STRING | Primary parcel tracking id |
| `hub` | STRING | Fulfillment hub: `SEA`, `ORD`, `ATL` |

# Relationships

- Line items live in [`order-lines`](./order-lines.md).
- Revenue recognition rules are in [`policies/revenue-recognition`](../policies/revenue-recognition.md).
- Used by [`computations/revenue-period`](../computations/revenue-period.md) and [`computations/gross-margin-period`](../computations/gross-margin-period.md).
