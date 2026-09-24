---
type: Playbook
title: Board Pack Margin Check
description: Pre-publish checklist so board gross margin matches the verified OKF metric and attested computation.
tags: [finance, governance]
status: stable
verified:
  - by: human:finance-vp@northstar
    at: 2026-07-01T09:00:00Z
---

# Checklist

1. Confirm the metric concept is [`metrics/gross-margin`](../metrics/gross-margin.md) with `status: stable` (not the legacy concept).
2. Run [`computations/gross-margin-period`](../computations/gross-margin-period.md) and retain the receipt.
3. Reject any BI explore that subtracts product cost only — see the misquoted-margin incident narrative in the RAG corpus.
4. If `stale_after` has passed, stop and re-verify with Finance.
