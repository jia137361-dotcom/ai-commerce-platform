# Product Description Rich Text Design

## Scope

Update the seller draft editor and buyer product detail page for formatted product descriptions.

## Design

- Keep the existing `description` field and API payload unchanged.
- Replace the seller draft description textarea with a small content-editable editor.
- Provide paragraph, bold, italic, unordered-list, and ordered-list controls.
- Store the editor value as limited HTML. Existing plain-text descriptions remain valid and editable.
- Render the description on the buyer page through a shared allowlist sanitizer. Allowed tags are paragraphs, line breaks, bold/strong, italic/emphasis, unordered/ordered lists, and list items. Strip attributes and all other markup.
- Change the buyer section heading from `Details` to `Description`.
- Stack the formatted description above the supplier/product detail table.
- Remove the product detail page's bottom `Design now` sticky bar. The purchase panel is outside this removal scope.

## Validation

- Add storefront tests covering the new heading, sanitized formatted markup, and description-before-table order.
- Add seller tests for the editor controls and HTML value behavior where the existing seller test setup supports it.
- Run targeted tests and TypeScript/build checks for both frontends.
