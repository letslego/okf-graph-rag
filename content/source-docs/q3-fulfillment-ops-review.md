# Northstar Commerce — Q3 Fulfillment Ops Review

Internal ops memo · Audience: warehouse leads, finance analytics · Status: draft for leadership sync

## Context

Northstar Commerce ships from three regional hubs (SEA, ORD, ATL). During Q3 we saw a 9% rise in average outbound shipping cost per delivered order, concentrated in apparel and home goods. Finance asked analytics to reconcile the ops narrative against the FY2026 Cost Allocation Standard before the board pack is locked.

## What the warehouses reported

- SEA hub introduced overnight parcel upgrades for same-day cutoffs after 14:00 local.
- ORD hub renegotiated last-mile rates mid-quarter; the new contract applies to parcels under 5 lb only.
- ATL hub absorbed a temporary surge fee from Carrier B during hurricane season (Aug 12–Sep 3).

Ops staff still quote "gross margin" using the pre-FY2026 habit: revenue minus product cost only. That habit understates COGS by omitting inbound fulfillment, outbound shipping, and payment fees — exactly the gap Finance closed in the FY2026 standard.

## Analytics asks

1. Confirm whether board-facing gross margin uses the full-COGS definition.
2. Attribute the shipping cost spike to carrier vs. zone mix before changing pricing.
3. Prefer the sanctioned revenue computation over ad-hoc `SUM(gross_amount)` queries; returns and multi-currency conversion are easy to get wrong.

## Source systems mentioned in the review

- Orders fact table (`northstar.commerce.orders`)
- Order lines and products dimensions
- Carrier invoice extracts (CSV drop into `ops/incoming/carrier_invoices/`)

This memo is unstructured source material. Chunks from this document are ingested into the RAG KV cache so agents can retrieve narrative context, then ground answers in OKF concepts for definitions, trust, and attested computations.
