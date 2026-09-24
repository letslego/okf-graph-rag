---
type: BigQuery Table
title: Order Lines
description: Order line items with product_id, quantity, and allocated amounts.
resource: bigquery://northstar-commerce/analytics/order_lines
tags: [orders, warehouse, fact]
status: stable
generated:
  by: curator_agent/demo-1.0
  at: 2026-06-30T14:00:00Z
---

# Notes

Join to [`orders`](./orders.md) on `order_id` and to [`products`](./products.md) on `product_id`. Product unit cost for COGS comes from the products dimension as of `order_ts`.
