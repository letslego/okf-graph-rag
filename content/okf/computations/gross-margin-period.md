---
type: Attested Computation
title: Gross Margin for a Period
description: Sanctioned SQL computing revenue minus full COGS for a date range.
tags: [finance, attested, sql, margin]
status: stable
stale_after: 2026-12-31T00:00:00Z
verified:
  - by: human:finance-vp@northstar
    at: 2026-07-01T09:00:00Z
executor:
  runtime: bigquery
  resource: skills/run-margin-sql.md
  receipt: [job_id, executed_sql, row_count]
attester:
  resource: attesters/sql-equality.py
parameters:
  - name: period_start
    type: DATE
  - name: period_end
    type: DATE
---

# Sanctioned SQL (illustrative)

```sql
SELECT
  r.revenue - c.product_cost - c.inbound_fulfillment
    - c.outbound_shipping - c.payment_fees AS gross_margin
FROM revenue_period(@period_start, @period_end) r
CROSS JOIN cogs_full_period(@period_start, @period_end) c;
```

Backs [`metrics/gross-margin`](../metrics/gross-margin.md). Outbound shipping inputs should come from the [`playbooks/carrier-reconciliation`](../playbooks/carrier-reconciliation.md) process.
