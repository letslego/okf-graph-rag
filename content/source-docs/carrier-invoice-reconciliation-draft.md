# Carrier Invoice Reconciliation Playbook (Narrative Draft)

This draft playbook describes how ops finance reconciles weekly carrier invoices against delivered parcels. It is intentionally verbose and slightly inconsistent — the kind of artifact RAG systems actually ingest.

## Weekly cadence

Every Monday, the ops analyst downloads Carrier A and Carrier B invoice CSVs. Rows include tracking id, zone, weight band, base rate, surcharge codes, and invoice date. Tracking ids are matched to `orders.tracking_id` for delivered parcels only.

## Common failure modes

- Overnight upgrades appear as surcharge code `OVN` and often get booked to the wrong cost center.
- Hurricane surge fees (`WX`) should map to outbound shipping COGS, not to marketing spend.
- Multi-piece shipments share one order id but multiple tracking ids; do not double-count revenue when attributing shipping cost.

## Relationship to margin

Outbound shipping is part of full COGS under the FY2026 Cost Allocation Standard. Any reconciliation that ignores shipping will inflate gross margin relative to the board pack. Prefer the OKF playbook concept once curated; this narrative draft remains in the RAG corpus for historical wording and edge-case notes.
