# Seller product variant label editing

## Goal

Allow sellers to rename S2B-derived color and size labels in Product Edit while preserving the supplier variant IDs and current enabled/disabled selections.

## Design

- Clicking an S2B color or size pill enters inline editing for that label.
- Enter/save commits the trimmed label to every product variant sharing the original label.
- Escape/cancel restores the label before editing. Empty labels are rejected and leave the previous value unchanged.
- Color and size sections each expose a small reset action.
- Reset resolves each variant's original label from the matching S2B supplier variant (`supplier_variant_id`) and changes only `color` or `size`; `enabled` and all other fields remain unchanged.
- Existing product `PUT /admin/store-products/:id` persistence is reused. No migration or new API is required.

## Verification

- Unit tests cover group rename, reset preserving enabled state, and empty-label protection.
- Seller dashboard tests and TypeScript validation must pass.
