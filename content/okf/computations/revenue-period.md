---
type: Attested Computation
title: Revenue for a Period
description: Sanctioned SQL that computes recognized revenue for a date range.
tags: [finance, attested, sql]
status: stable
stale_after: 2026-12-31T00:00:00Z
verified:
  - by: human:finance-vp@northstar
    at: 2026-07-01T09:00:00Z
executor:
  runtime: bigquery
  resource: skills/run-revenue-sql.md
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
SELECT SUM(net_amount_usd) AS revenue
FROM analytics.orders_recognized
WHERE delivered_date BETWEEN @period_start AND @period_end
  AND return_window_closed = TRUE;
```

Backs [`metrics/revenue`](../metrics/revenue.md). Reads from the recognized-orders view built on [`tables/orders`](../tables/orders.md).
