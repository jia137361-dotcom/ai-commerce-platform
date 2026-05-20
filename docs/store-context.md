# Store Context

Phase 1 uses a single-store-first, multi-store-ready model. API routes should resolve the current store from request context instead of assuming one global store forever.

## Current Behavior

Store context is resolved by `resolveCurrentStore(req)` in `apps/medusa-backend/src/lib/store-context/index.ts`.

The returned shape is:

```ts
{
  store_id: string
  source: "header" | "host" | "default"
}
```

Resolution order today:

1. Read `X-Store-Id` from the request header.
2. If the header is present and non-empty, trim it and return it with `source: "header"`.
3. If no header is present and the request host starts with `localhost`, return `DEFAULT_STORE_ID` with `source: "host"`.
4. Otherwise return `DEFAULT_STORE_ID` with `source: "default"`.

## X-Store-Id

`X-Store-Id` is supported as the explicit Phase 1 store selector.

Example:

```http
X-Store-Id: test_store
```

If multiple header values are received, the first value is used. Empty values are ignored.

## DEFAULT_STORE_ID

`DEFAULT_STORE_ID` is read from the environment and falls back to:

```text
default_store
```

[`apps/medusa-backend/.env.example`](../apps/medusa-backend/.env.example) defines:

```text
DEFAULT_STORE_ID=default_store
```

The seed script currently creates both `default_store` and `test_store` when they do not already exist.

## Localhost And Default Fallback

Local development requests without `X-Store-Id` fall back to `default_store`.

Current localhost behavior is intentionally simple:

- `Host: localhost...` resolves to `DEFAULT_STORE_ID`.
- Other hosts also fall back to `DEFAULT_STORE_ID` if no header is present.

This keeps Phase 1 APIs usable before custom domain routing is implemented.

## Domain Binding

The `DomainBinding` model exists with these fields:

- `id`
- `store_id`
- `domain`
- `status`
- `ssl_status`
- `verified_at`

However, domain lookup is currently reserved and not implemented. `resolveCurrentStore` does not query domain bindings yet. Future behavior should map the request host to an active verified domain binding before falling back to `DEFAULT_STORE_ID`.

## Invalid Store Behavior

Current behavior has an important caveat: `resolveCurrentStore` only resolves an identifier. It does not validate that the store exists.

Known current behavior:

- Some admin write APIs validate the chosen store and return `STORE_NOT_FOUND`.
- Storefront read APIs generally filter by the resolved `store_id`; an unknown store usually returns empty data rather than a store error.
- `X-Store-Id` is trusted as input until a route performs its own validation.

Developer 3 tests should document this behavior before any PR changes it.

## Store Isolation Principles

Store-aware APIs should follow these rules:

- Resolve store context once per request.
- Filter store-owned records by `store_id`.
- Avoid returning records from another store.
- Avoid updating records from another store.
- Prefer selectors that include both resource id and `store_id` for store-owned resources.
- Treat admin `body.store_id` overrides as a risk until explicit access rules exist.
- Add tests when store-aware behavior changes.

## Routes Expected To Use Store Context

Current Phase 1 routes expected to scope data by the resolved store include:

- Storefront products.
- Storefront product categories.
- Storefront store settings.
- Admin product draft creation and publishing.
- Admin product category listing and creation.
- Admin store settings reads and writes.

Future cart, order, checkout, and payment routes should also bind data to the resolved store context.

For local testing, `X-Store-Id` is the practical mechanism for switching between `default_store` and `test_store`. `DEFAULT_STORE_ID` remains the fallback when no header is supplied. Domain binding records are reserved for future host/domain routing; production multi-domain isolation should not be assumed until that lookup is implemented and tested.
