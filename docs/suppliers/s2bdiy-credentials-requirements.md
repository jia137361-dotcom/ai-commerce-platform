# S2BDIY Credentials and Runtime Configuration Requirements

This document explains which runtime values are required before running the
S2BDIY supplier dry-run, what the Eolink API snapshot provides, and what still
must come from a teammate, supplier dashboard, or supplier confirmation.

Do not commit real `app_secret`, access tokens, Authorization headers, or other
supplier credentials.

## 1. Required Environment Variables

| Env Var | Meaning | Source | Required For |
|---|---|---|---|
| `S2BDIY_BASE_URL` or `S2BDIY_API_BASE_URL` | Open API base URL | Supplier / S2BDIY dashboard / teammate | Phase 1+ |
| `S2BDIY_APP_KEY` | `app_key` for `/open/v1/accessToken` | Supplier / teammate / child user creation | Phase 1+ |
| `S2BDIY_APP_SECRET` | `app_secret` for `/open/v1/accessToken` | Supplier / teammate / child user creation | Phase 1+ |
| `S2BDIY_TEST_MODE` | Local safety gate confirming the credentials and base URL are test/sandbox | Local env after human confirmation | Phase 1+ |
| `S2BDIY_DRY_RUN_MAX_PHASE` | Local phase selector; defaults to `0` | Local env | Optional, defaults to Phase 0 only |
| `S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE` | Human safety confirmation that Create Order does not charge or trigger production | Teammate / supplier confirmation | Phase 2 |
| `SUPPLIER_ALLOW_PAYMENT` | Payment safety gate | Local env / human approval | Future payment-only script |
| `HUMAN_APPROVED_PAYMENT` | Payment safety gate | Human approval | Future payment-only script |

## 2. What Eolink Provides

The Eolink API snapshot provides:

- API paths, such as `/open/v1/accessToken`, `/open/v1/basicProduct`,
  `/open/v1/product/quickCreate`, `/open/v1/order`, and `/open/v1/orderPay`.
- Request methods and request parameters.
- Response schemas and examples.
- The token exchange mechanism:
  `POST /open/v1/accessToken` with `app_key + app_secret` returns `data.token`.
- Bearer token usage for authorized business APIs:
  `Authorization: Bearer <token>`.
- A documented token validity of approximately 3 days.
- A child user creation mechanism:
  `POST /open/v1/childUser` returns child `app_key` and `app_secret`, but only
  after an already authorized parent token exists.

## 3. What Eolink Does Not Provide

The Eolink API snapshot does not provide enough information by itself to run the
dry-run from a clean local environment.

It does not provide:

- A concrete Open API base URL when the page only shows `{{host}}`.
- A real initial `app_key`.
- A real initial `app_secret`.
- Production vs sandbox confirmation unless explicitly stated outside the API
  snapshot.
- A guarantee that `POST /open/v1/order` only creates an unpaid order and never
  charges, reserves balance, or triggers production in the active account.
- A standalone balance query API, if it is not documented in the snapshot.

The request examples use placeholders such as:

```json
{
  "app_key": "xxx",
  "app_secret": "xxxx"
}
```

Those placeholders are not usable credentials.

The API examples may show returned child credentials, but those are example
response values and must not be treated as live credentials.

## 4. Credential Acquisition Options

### Option A: Existing Test Credentials

A teammate provides existing test/sandbox values:

```text
S2BDIY_BASE_URL
S2BDIY_APP_KEY
S2BDIY_APP_SECRET
```

This is the recommended first path for Phase 1.

### Option B: Supplier Dashboard Credentials

The supplier dashboard or S2BDIY account console provides the Open API base URL,
`app_key`, and `app_secret`.

Before running Phase 1, confirm whether the credentials are sandbox/test or
production. Production-like credentials must not be used for mutation tests
without explicit human approval.

### Option C: Parent Credentials Create Child User

If parent account credentials are available, the flow can be:

```text
existing parent app_key/app_secret
-> POST /open/v1/accessToken
-> POST /open/v1/childUser
-> child app_key/app_secret
-> POST /open/v1/accessToken as child
```

This is not a first-step credential acquisition path. `POST /open/v1/childUser`
requires `Authorization: Bearer <token>`, and that token requires existing
parent `app_key + app_secret`.

`childUser` also mutates supplier account state by creating a child Open API
account. It must not run automatically in the dry-run script. It is appropriate
only when a human explicitly approves child account creation, supplier account
provisioning is in scope, and returned child credentials can be stored securely.

## 5. Required Values Before Phase 1

Phase 1 can start only when all of these are true:

```text
S2BDIY_BASE_URL or S2BDIY_API_BASE_URL is set
S2BDIY_APP_KEY is set
S2BDIY_APP_SECRET is set
S2BDIY_TEST_MODE=true
base URL is confirmed test/sandbox
```

The dry-run script must not print full secrets or tokens. Use masked values in
reports and command logs.

## 6. Required Confirmation Before Phase 2

Phase 2 creates an unpaid supplier order for pricing. It can start only when all
of these are true:

```text
Phase 1 completed successfully
S2BDIY_TEST_MODE=true
base URL is confirmed test/sandbox
S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE=true
supplier or teammate confirms Create Order does not charge or trigger production
```

Even in Phase 2, the dry-run script must not call:

```text
POST /open/v1/orderPay
```

Payment belongs in a separate manually approved payment test.

## 7. Recommended First Test

Use existing test credentials and run Phase 1 only:

```bash
S2BDIY_BASE_URL="..." \
S2BDIY_APP_KEY="..." \
S2BDIY_APP_SECRET="..." \
S2BDIY_TEST_MODE=true \
S2BDIY_DRY_RUN_MAX_PHASE=1 \
bash scripts/supplier-single-store-dry-run.sh
```

Do not run Phase 2 until Create Order no-charge behavior is confirmed.

## 8. Questions for Teammate / Supplier

1. What is the Open API test base URL?
2. What are the test `app_key` and `app_secret`?
3. Is this sandbox/test, not production?
4. Does `POST /open/v1/order` charge money, reserve balance, or trigger
   production, or does it only create an unpaid order?
5. Is there a balance query API?
6. Should we use existing credentials or create a child user?
7. If child user creation is required, do we have approval to call
   `POST /open/v1/childUser`?

## 9. Runtime Value Audit

| Required Runtime Value | Can be obtained from Eolink docs? | Evidence | Notes |
|---|---|---|---|
| `S2BDIY_BASE_URL` | PARTIAL | API snapshot uses `{{host}}`; local docs list candidate sandbox/production hosts. | `{{host}}` is not a concrete runtime value. Candidate hosts still need supplier confirmation. |
| `S2BDIY_APP_KEY` | NO | `/open/v1/accessToken` requires `app_key`, but examples use placeholders. | Initial key must come from teammate, dashboard, or approved child user creation. |
| `S2BDIY_APP_SECRET` | NO | `/open/v1/accessToken` requires `app_secret`, but examples use placeholders. | Initial secret must come from teammate, dashboard, or approved child user creation. |
| access token | PARTIAL | `/open/v1/accessToken` documents how to exchange credentials for `data.token`. | The token can be obtained only after real `app_key + app_secret` are available. |
| `Authorization: Bearer <token>` format | YES | API 05 describes adding `Authorization: Bearer <token>` to later requests. | Use masked Authorization values in logs. |
| test/sandbox URL | PARTIAL | Local supplier docs list `https://opentest.s2bdiy.com`. | Confirm with supplier that it is the correct Open API sandbox for this account. |
| production URL | PARTIAL | Local supplier docs list `https://openapi.s2bdiy.com`. | Do not run mutation tests against production by default. |
| Create Order no-charge confirmation | UNKNOWN | API 25 says payment is separate via `/open/v1/orderPay`, but still marks no-charge as needing supplier confirmation. | Phase 2 must require `S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE=true`. |
| balance API | UNKNOWN | API 22 references insufficient balance as an error case, but the 26 API snapshot does not document a balance query endpoint. | Ask supplier whether a balance query API exists or use supplier dashboard. |
