# Incident Notes — Misquoted Gross Margin in Self-Serve BI

Date: 2026-08-19 · Severity: medium · Owner: Analytics Platform

## Symptom

A Looker explore labeled "Gross Margin %" began showing values ~5pp higher than the Finance board pack for July. Several category managers copied the explore into weekly decks.

## Root cause

The explore joined `orders.net_amount` to product unit cost only. It did not subtract inbound fulfillment, outbound shipping, or payment processing fees. That matches the deprecated pre-FY2026 definition (`gross-margin-legacy`), not the current verified Metric concept.

## Fix

1. Point the explore at the sanctioned Attested Computation for period gross margin.
2. Add a banner in BI: "Use OKF Metric `metrics/gross-margin` — full COGS required."
3. Leave the legacy explore available under a `historical_only` folder with `status: deprecated` messaging.

## Lessons for retrieval systems

Vector search over ops memos alone is not enough. A document mentioning "gross margin" can retrieve the wrong definition. Graph RAG should expand from the matched narrative chunk into the OKF concept graph, then prefer concepts with human verification and `status: stable` over deprecated siblings.
