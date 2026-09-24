---
type: BigQuery Table
title: Products
description: Product dimension including category and unit cost used in full-COGS calculations.
resource: bigquery://northstar-commerce/analytics/products
tags: [products, dimension]
status: stable
generated:
  by: curator_agent/demo-1.0
  at: 2026-06-30T14:00:00Z
---

# Notes

`unit_cost` is product cost only. Inbound fulfillment, outbound shipping, and payment fees are accounted separately and must still be included when computing [`metrics/gross-margin`](../metrics/gross-margin.md).
