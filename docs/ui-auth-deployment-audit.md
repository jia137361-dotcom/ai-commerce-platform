# Ciiverse UI, Auth, Deployment Audit

Audit date: 2026-07-30
Worktree: `/Users/Zhuanz/Downloads/ai-commerce-platform/.worktrees/ciiverse_0714`
Branch: `codex/ciiverse-0714-web-fixes`
HEAD: `6b650152b77776496b3c193af14bed5cf14b5e4b`
Mode: static audit only. No browser, Playwright, screenshots, migrations, commits, pushes, real OAuth, real Stripe payment, or real S2BDIY order calls.

## Executive Summary

The current Ciiverse implementation is functionally broad but visually inconsistent with the final `part 5` buyer design language. Buyer has real routes and APIs for the main commerce loop, account pages, addresses, coupons, payment methods, reviews, refunds, messages, AI design, and tracking, but many surfaces are `PARTIAL`: they use desktop-ish cards, legacy CSS, fallback data, or incomplete states where the design expects mobile-first Temu/Taobao-style flows.

Authentication is not production-mature. Buyer uses Medusa email/password auth and creates an HttpOnly session via `/auth/session`, which is the right direction, but the UX lacks forgot/reset password, route-level email verification, resend flow placement, remember-me behavior, Google login, and verified-email gating. Seller auth stores a bearer token in `localStorage`, has no HttpOnly session, no email verification, no password reset, no rate limiting, and no OAuth boundary. This should be treated as `INSECURE/PARTIAL` for production.

Deployment has useful scaffolding: Docker compose, production deploy scripts, backup, migration gate, health checks, Redis, PostgreSQL, Stripe provider wiring, Resend dependency, S2BDIY modes, and AI worker containerization. It is not yet production-ready because secrets management, HTTPS/reverse proxy/domain, cookie domains, OAuth callbacks, object storage/CDN, backups/restore drills, monitoring, rate limits, CI/CD gates, and staging separation are incomplete or undocumented.

## Initial Command Check

Required preflight commands were executed in the requested worktree:

```text
pwd
/Users/Zhuanz/Downloads/ai-commerce-platform/.worktrees/ciiverse_0714

git branch --show-current
codex/ciiverse-0714-web-fixes

git rev-parse HEAD
6b650152b77776496b3c193af14bed5cf14b5e4b

git status -sb
## codex/ciiverse-0714-web-fixes
?? apps/medusa-backend/static/banners/01KX2P21ZPPSRYY6VJJERRBQYG-banner-3d2686fb1dd8.png
?? apps/medusa-backend/static/banners/01KX2P21ZPPSRYY6VJJERRBQYG-banner-969c8a852746.jpg
?? apps/medusa-backend/static/product-images/
?? docs/current-platform-progress.html
```

The path and branch are correct. Existing untracked files were treated as current worktree artifacts and were not modified.

## Design File Index

### Design Directories Read

| Directory | File count | Main file types | Role |
|---|---:|---|---|
| `/Users/Zhuanz/Downloads/citigoo 买家端页面` | 98 | 97 PNG + one extensionless file | Earlier buyer mobile/desktop page set: shop, product, checkout, login, account, orders. |
| `/Users/Zhuanz/Downloads/part 5` | 791 | 542 PNG, 228 PSD, 8 JPG, 6 DOCX, 2 XLSX, 1 TXT, 4 extensionless | More complete/current buyer design library and navigation/IA notes. |

### Documentation And Supporting Files Read

| File | Use |
|---|---|
| `/Users/Zhuanz/Downloads/页面分析.docx` | Primary design notes: single-store conversion, Design Now, login/register, navigation, account settings, coupons, orders. |
| `/Users/Zhuanz/Downloads/页面分析.xlsx` | IA keyword list: Buyer/Seller settings and new dashboard sections. |
| `/Users/Zhuanz/Downloads/part 5/页面分析.xlsx` | Same/supplemental IA list for buyer/seller navigation. |
| `/Users/Zhuanz/Downloads/part 5/Login & register/DOC/Login-Register.docx` | Auth screen behavior: sign in, register, reset password, social login icons. |
| `/Users/Zhuanz/Downloads/part 5/Search/DOC/Search.docx` | Search states: initial, suggestions, selected search result. |
| `/Users/Zhuanz/Downloads/part 5/Orders/Order-All.docx` | Order buckets and states. |
| `/Users/Zhuanz/Downloads/part 5/Notifications/DOC/notificationList.docx` | Notification categories and content taxonomy. |
| `/Users/Zhuanz/Downloads/part 5/Account & security/Deactivate or delete account/Delete account.docx` | Deactivate/delete-account production policy flow. |
| `/Users/Zhuanz/Downloads/platform-flowchart.html` | Older functional map; used only as reference, not as current fact. |
| `docs/current-platform-progress.html` | Historical progress report; corrected below. |
| `docs/frontend-prd-with-assets.md` | Earlier PRD; important note that seller dashboard has no finished design assets. |
| `docs/buyer-ui-design-coverage-report.md` | Older buyer design coverage; corrected against current code. |
| `docs/buyer-auth-architecture.md` | Buyer auth architecture baseline. |
| `docs/production-release.md` | Production deploy checklist baseline. |

### Page/Page-State Mapping From Design Assets

| Design asset group | Page interpretation | Device coverage | States identified | Final-version note |
|---|---|---|---|---|
| `part 5/Homepage_@ part 1/pc version/With Stores only/快照2-2-1.png` | Buyer desktop homepage/product grid | Desktop | default, category nav, account hover target, support/language menus in notes | More current than older `citigoo 买家端页面/shop page` for homepage. |
| `part 5/Homepage_@ part 1/mobile version/With Stores only/V2/Homepage/快照1-5-3-2.png` | Buyer mobile homepage | Mobile | default, bottom nav, signed-out Me/Sign In | V2 appears final for mobile homepage. |
| `part 5/Homepage_@ part 1/mobile version/With Stores only/V2/Categories/*` | Mobile categories | Mobile | default, selected category, View All | V2 appears current. |
| `part 5/Homepage_@ part 1/mobile version/With Stores only/V2/Filter/*` | Mobile filter drawer/page | Mobile | selected, expanded, price, ship-from filters | Current target, needs code alignment. |
| `part 5/Search/*` + `Search.docx` | Search | Mobile | initial, focused, suggestions, result | Requires suggestions/dropdown; current code is result-only-ish. |
| `part 5/Product details@ part 2/*` | Product detail | Mobile | price original/discount, item detail, reviews, country popup, shipping popup, share popup, 3-dot popup | Notes explicitly say remove Add to cart and replace Buy Now with Design Now. |
| `part 5/Cart/Add to cart/*` | Cart | Mobile | default, selected items, manage/delete, drawer/expanded states | Multi-store sample must be converted to single-store. |
| `part 5/Cart/Submit order/*` | Checkout/confirm order | Mobile | no address, address selected, payment method not selected, discounts, shipping | Current route exists but desktop/card layout diverges. |
| `part 5/Cart/Buy now/*` | Payment/submit enabled states | Mobile | no discount, coupon, free shipping, paid shipping, disabled payment | Current Stripe Payment Element differs visually. |
| `part 5/Login & register/Register by Email only/*` | Login/register/reset | Mobile | sign in, sign up, reset password, social login, remember me | Final target says register only email+password; phone version is marked not applicable. |
| `part 5/Orders/*` + `Order-All.docx` | Orders list/detail/tracking | Mobile | all, unpaid, shipped/sent, delivered/used, refund/after-sales, reviews, empty states | Current order pages are real but not fully visually aligned. |
| `part 5/Reviews/*` | Reviews | Mobile | pending review, reviewed, photo upload/review states | Current review dialog exists; full page/bucket UX partial. |
| `part 5/Coupon/*` | Coupons | Mobile | all/shopping/expiring/goods, detail drawer | Current coupon wallet partial, DB migration runtime unverified. |
| `part 5/Messages - e-commerce/*`, `Messages - social/*`, `Messages Notification/*` | Messages/notifications | Mobile | list, thread, buyer/seller chat, notification categories | Current routes are simple and partial. |
| `part 5/Address/*` and `citigoo 买家端页面/Delivery address/*` | Addresses | Mobile | empty, add, edit, manage/delete | Current address book exists but layout differs. |
| `part 5/Payment methods/*` | Payment methods | Mobile | first time, add card, manage, edit card | Current saved payment method flow is partial Stripe setup. |
| `part 5/Country & region/*`, `Currency/*`, `Language/*` | Preference pages | Mobile | selected/default | Current country/currency partial; language static/preference incomplete. |
| `part 5/Account & security/*` | Account security | Mobile | password change, social connect, delete/deactivate | Current security page only partial email verification/change password. |
| `part 5/Settings/Buyer/mobile_2_2_2.png` | Buyer settings IA | Mobile | list navigation, logged-out/login, logout | Current account nav differs. |
| `part 5/Settings/Seller/mobile_2_2_1.png` | Seller/mobile IA reference | Mobile | seller sections and account settings | This is IA reference, not enough for desktop seller dashboard final visual. NEED_CONFIRMATION. |
| `part 5/Terms and policies/*`, `About/*`, `Help center/*` | Static info pages | Mobile | list/detail | Current static pages exist but not mobile-native. |

No true tablet-specific design set was found. Desktop coverage is primarily homepage; most detailed assets are mobile. Seller desktop UI designs are not present; current seller pages should be treated as product/engineering UI until final design is confirmed.

## Historical HTML Correction List

`docs/current-platform-progress.html` is stale and internally warns that it audited an older worktree/commit. It must not be used as current fact. Corrections:

| Old report claim/theme | Current correction |
|---|---|
| HEAD shown as `d3323e43...` | Current audited HEAD is `6b650152...`. |
| Working tree counts in old report are different | Current visible untracked set is static banners/product images plus old HTML. |
| Coupon status treated as migration/runtime blocker only | Current code has seller coupon UI, buyer wallet, cart coupon API, migration, and tests, but runtime still depends on DB migration. Status should be `PARTIAL/BLOCKED`, not simply Todo/Done. |
| Account & Security placeholder text said password reset/change and email verification unavailable | Current code has `AccountSecurityContent`, `/store/customers/me/email-verification`, and `/store/customers/me/password`; however forgot/reset and UX routes are missing. Status should be `PARTIAL`. |
| Buyer login/register marked covered in older coverage | Current design requires Remember me, Forgot password, Google/Apple/social buttons, terms/privacy placement, and email-only signup. Current UI is functionally usable but visually and behaviorally partial. |
| S2B CSV/import may be shown as worktree-only in old report | Current branch contains S2B import workspace/routes in tracked code from recent commits, but runtime and real supplier behavior remain unverified. |
| Stripe may be implied done | Current static code supports Stripe; real payment, webhook and deploy-mode readiness were not verified in this audit and must remain `RUNTIME_UNVERIFIED`. |
| Seller dashboard “Done” language | Seller has functional routes, but no final seller visual design. UI status should be `FUNCTION_ONLY/PARTIAL`, not visual Done. |
| Product detail marked close to design | Current product detail still contains add-to-cart-oriented flows and desktop structure; target mobile design says primary action should be Design Now. |
| Platform/multistore surfaces in older flowchart | Current project target remains default_store MVP with future multi-store readiness. Marketplace/platform checkout surfaces should not drive this UI polish phase unless explicitly requested. |

## Buyer Page Audit

Status vocabulary: `MATCH`, `CLOSE`, `FUNCTION_ONLY`, `PARTIAL`, `UI_ONLY`, `MISSING`, `BLOCKED`, `NEED_CONFIRMATION`.

| Page | Design file path | Current route | Component/API | Status | Main gaps | Priority | Acceptance conditions |
|---|---|---|---|---|---|---|---|
| Homepage | `/Users/Zhuanz/Downloads/part 5/Homepage_@ part 1/...` | `/`, `/store`, `/shops/:slug` | `apps/storefront/src/pages/store/StoreHomePage.tsx`; `/store/settings`, `/store/products`, `/store/product-categories` | `PARTIAL` | Uses real data and mobile components, but desktop/mobile typography, nav, account hover, support/language menus, visual density and product-card treatment differ from design. | P1 | Desktop and mobile first viewport match target structure; account/support/language menu states exist; no fallback-demo banner in production. |
| Categories | `part 5/Homepage_@ part 1/mobile version/With Stores only/V2/Categories/*` | `/categories` | `CategoriesPage.tsx`; `MobileCircleCategories`; `/store/product-categories` | `PARTIAL` | Route exists but category hierarchy, selected state and Temu-style mobile grid are only approximate; no tablet spec. | P1 | Featured/trending/categories states match V2; empty/loading/error states designed. |
| Search | `part 5/Search/*`, `Search.docx` | `/search` | `SearchPage.tsx`; `/store/products` | `PARTIAL` | Result page exists; suggestion dropdown and initial/focus states are incomplete. | P1 | Initial, focused, suggestions, empty, results states match doc. |
| Filter | `part 5/Homepage_@ part 1/.../Filter/*` | query/drawer on `/store`, `/categories`, `/search` | `FilterDrawer.tsx`; product query client | `PARTIAL` | Design expects full mobile filter taxonomy: category, sort, color, material, size, occasion, price, ships-from; current supports narrower logic. | P1 | Every filter section renders with selected/disabled states and maps to backend query or honest unavailable copy. |
| Product list | Homepage/product grid files | `/store`, `/categories`, `/search` | `StoreProductGrid`, `StoreProductCard`, `StoreCatalogResults` | `PARTIAL` | Real data; card size, badges, cart/design action, AD/new labels, mobile density differ. | P1 | Cards match mobile 2-column and desktop grid specs; all image missing/loading states polished. |
| Product detail | `part 5/Product details@ part 2/*` | `/products/:id` | `ProductDetailPage.tsx`; `/store/products/:id`, reviews/share/favorite/cart APIs | `FUNCTION_ONLY` | Real product/detail/reviews/cart link exist, but design says remove Add to cart/Buy Now and use Design Now; popups/tabs/price/detail sections not exact. | P0 | Mobile PDP matches item/size/review/detail/recommend flow; Design Now is primary; popup share/country/shipping states match. |
| Design Now | Product detail notes, `Cart/Add to cart` notes | `/design/:productId`, product actions | `DesignerPage.tsx`; `/store/design-sessions/*` | `PARTIAL` | Route exists and business flow exists; entry/action labeling not fully aligned to design. | P0 | PDP CTA always leads to design flow where required; cart add is clearly after design. |
| AI Design | Settings IA, Plans notes | `/ai-design`, `/ai-design/:productId`, `/ai-studio/:productId` | `AiDesignPage.tsx`; `/store/ai/generate`, `/store/ai/jobs/*`, `/store/my-designs` | `PARTIAL` | Functional but design for buyer AI studio is not fully specified; plan/credit UX is partial. | P1 | Prompt, generation, error, credit exhaustion, save/design-center handoff states accepted. |
| Cart | `part 5/Cart/Add to cart/*` | `/cart` | `CartPage.tsx`; `/store/carts/*`; local cart registry | `PARTIAL` | Real multi-store/platform cart logic exists but target says single-store; mobile manage/select/delete and count sync not fully aligned. | P0 | Single-store cart design, selected item count, manage/delete, empty/loading/error states match. |
| Checkout | `part 5/Cart/Submit order/*` | `/checkout` | `CheckoutPage.tsx`; address, shipping, coupons, payment collection APIs | `FUNCTION_ONLY` | Strong real flow but desktop/card layout differs from mobile confirm-order design; payment-method list and coupon visual differ. | P0 | Address/no-address, shipping, coupon, payment method, disabled/enabled states match; no real payment in tests. |
| Payment | `part 5/Cart/Buy now/*`, payment icons | `/checkout` | `CheckoutPaymentPanel`, `StripePaymentForm`; Stripe provider | `PARTIAL` | Stripe code exists; production card/payment-method UX and wallet options are partial and runtime unverified. | P0 | Test-mode Payment Element works, failure states user-safe, no fake card UI when Stripe unavailable. |
| Checkout success | Order notes | `/checkout/success` | `CheckoutSuccessPage.tsx`, `CheckoutSuccessSummary` | `CLOSE` | Real summary exists; mobile success page visual and View order transition need final polish. | P1 | Shows transaction success, View order, order id/email, next tracking state. |
| Login | `part 5/Login & register/Register by Email only/CitigooPay-118.png` | `/account/sign-in` | `SignInPage`, `SignInForm`; `/auth/customer/emailpass`, `/auth/session` | `PARTIAL` | No remember me, forgot password, Google/social buttons, exact mobile tab design. | P0 | Email/password login, Remember me, Forgot password, Google button placeholder/flow, safe errors, terms links. |
| Register | `part 5/Login & register/Register by Email only/CitigooPay-121/123.png` | `/account/register` | `RegisterPage`, `RegisterForm`; `/auth/customer/emailpass/register`, `/store/customers` | `PARTIAL` | Form asks first/last/phone although target says only email+password. No verification prompt after signup. | P0 | Signup requires only email/password; creates customer/session; directs to verification gate. |
| Email verification | Login notes, Account security docs | no dedicated route; `/account/security` component | `AccountSecurityContent`; `/store/customers/me/email-verification` | `PARTIAL` | API/component exist, but no dedicated verify-email route, resend CTA in auth flow, or checkout gating. | P0 | Send/resend/confirm route with 6-digit code, expiry UX, verified checkout policy. |
| Forgot password | Login doc `CitigooPay-124.png` | Missing | none found | `MISSING` | No forgot/reset email flow route or backend reset token lifecycle. | P0 | Request email, neutral success, reset link/code, token expiry, password update and sign-out old sessions. |
| Reset password | Login doc | Missing | none found | `MISSING` | Change-password for signed-in user exists, but not forgot/reset. | P0 | Reset route validates token, sets new password, handles expired/used token. |
| Account overview | `part 5/Me`, `Settings/Buyer` | `/account` | `AccountHomePage`, `AccountNavigation`; `/store/customers/me`, plan API | `PARTIAL` | Functional but not matching mobile list IA and visual rhythm. | P1 | Mobile Me/settings layout matches design; desktop account layout accepted. |
| Profile | `part 5/Profile/*` | `/account/profile` | `AccountProfilePage`, `AccountProfileForm`; `/store/customers/me` | `PARTIAL` | Name/phone update exists; avatar/email change and exact mobile design incomplete. | P2 | Profile fields, save states, avatar/email policy confirmed. |
| Orders | `part 5/Orders/*`, `Order-All.docx` | `/account/orders` | `OrderHistoryPage`; `/store/customers/me/orders` | `PARTIAL` | Real buckets but labels/visual cards/search differ; full status taxonomy not complete. | P1 | All/unpaid/shipped/delivered/refund/reviews empty and populated states match. |
| Order detail | `part 5/Orders/*`, `订单详情页面/*` | `/account/orders/:id` | `OrderDetailPage`; authenticated/guest detail APIs | `PARTIAL` | Real data/actions; mobile hierarchy, status and after-sales visuals differ. | P1 | Merchant info omitted per notes; action availability matches real backend state. |
| Tracking | `part 5/Orders/CitigooPay-71-i2-2.png`, `订单/物流追踪页.png` | `/account/orders/:id/tracking` | `OrderTrackingPage`; `/store/orders/:id/tracking` | `PARTIAL` | Real supplier/shipment data, but no real carrier provider and visual timeline partial. | P1 | Waiting/shipped/delivered/no-tracking states match; mock clearly dev-only. |
| Reviews | `part 5/Reviews/*` | Review dialog in orders/product | `OrderReviewDialog`, reviews APIs | `PARTIAL` | Pending/reviewed pages and full mobile review management not complete. | P2 | Pending and reviewed buckets, photo upload, rating, product display accepted. |
| Refund | Orders refund/after-sales docs | `/account/orders/:id` modal/action | refund request API/module | `PARTIAL` | Request flow exists; full after-sales/return tracking page missing. | P1 | Refund request states: eligible, pending, rejected, refunded, return processing. |
| Coupons | `part 5/Coupon/*` | `/account/coupons`, checkout coupon panel | `AccountCouponsPanel`; `/store/customers/me/coupons`, `/store/carts/:id/coupons` | `PARTIAL` | Wallet exists; runtime depends on migration; design card/drawer not exact. | P0 | Claim, available/unavailable, expiry, checkout apply/clear, no duplicate redemption. |
| Messages | `part 5/Messages - e-commerce/*` | `/account/messages` | `StoreMessagesPage`; `/store/messages` | `PARTIAL` | Simple thread exists; not full chat/notification design. | P2 | Buyer/seller thread list, empty, send, error, unread states. |
| Notifications | `part 5/Notifications/*`, doc | Account setting absent | seller admin notifications exist; buyer notification page not found | `MISSING` | Taxonomy documented but no buyer notification center. | P2 | Order/product/account/support notification preferences and list. |
| Saved | `part 5/Saved/*` | `/saved` | `SavedPage`; `/store/favorites` | `PARTIAL` | Route/API exist, visual saved collection not fully aligned. | P2 | Empty, saved list, remove, move-to-design/cart states. |
| Addresses | `part 5/Address/*` | `/account/addresses` | `AddressBook`; `/store/customers/me/addresses` | `PARTIAL` | Real CRUD exists; mobile manage/add/edit design differs. | P1 | Empty, add, edit, manage/delete, default address state match. |
| Payment methods | `part 5/Payment methods/*` | `/account/payment-methods` | `AccountPaymentMethods`; Stripe setup APIs | `PARTIAL` | Real saved-card setup depends on Stripe env; design includes card/paypal/apple/google list. | P1 | Stripe configured/unconfigured, add card, manage, default, remove states. |
| Country & region | `part 5/Country & region/*` | `/account/country-region` | `PreferenceList`; customer metadata | `PARTIAL` | Preference save exists; actual ship-from/country availability enforcement partial. | P2 | Country selection drives catalog/checkout availability. |
| Language | `part 5/Language/*` | Placeholder/static via settings? | locale utilities, no full route in App | `MISSING` | English-only target accepted for Phase 1, but settings route missing. | P3 | English selected page or defer explicitly. |
| Currency | `part 5/Currency/*` | `/account/currency` | display preferences | `PARTIAL` | Display conversion only; payment currency remains cart currency. | P2 | Clearly communicates display-only or real multi-currency implementation. |
| Account security | `part 5/Account & security/*` | `/account/security` | `AccountSecurityContent`; email verification/password APIs | `PARTIAL` | Some security APIs exist; no OAuth linking, sessions, account deletion UX. | P0 | Verification, password change/reset, social connect status, delete/deactivate policy. |
| Plans | design notes, IA | `/plans` | `PlansPage`; `/store/customers/me/plan` | `UI_ONLY/PARTIAL` | Plans are metadata/demo-like, not subscription billing. | P2 | Decide Phase 1 scope: display-only or Stripe subscription later. |

## Seller Page Audit

Important: `docs/frontend-prd-with-assets.md` says seller AI/admin pages have no finished design assets. `part 5/Settings/Seller/mobile_2_2_1.png` is an IA reference, not a desktop dashboard visual spec. Seller visual statuses are therefore mostly `FUNCTION_ONLY` or `NEED_CONFIRMATION`.

| Page | Design file path | Current route | Component/API | Status | Main gaps | Priority | Acceptance conditions |
|---|---|---|---|---|---|---|---|
| Login | Seller design missing; auth design can borrow buyer login | `/login` | `Login.tsx`; `/auth/user/emailpass`, `/seller/session` | `FUNCTION_ONLY` | Uses card/gradient, no final seller design, no forgot/password/OAuth, token in localStorage. | P0 | HttpOnly seller session or accepted token strategy, production-safe errors, reset flow. |
| Register | Seller design missing | `/register` | `Register.tsx`; `/seller/register` | `FUNCTION_ONLY` | Requires store/name fields; no email verification, no staged onboarding decision. | P0 | Seller signup policy confirmed, email verification required before publish. |
| Dashboard | `Settings/Seller` IA only | `/` | `Overview.tsx`; orders/messages/reviews/notifications/followers/session APIs | `FUNCTION_ONLY` | Dense engineering dashboard, not final visual. | P1 | Store KPIs, orders, messages, reviews, alerts, clear empty/loading/error states. |
| Products | no final design | `/products` | `ProductList.tsx`; `/admin/store-products`, publish/unpublish/bulk APIs | `FUNCTION_ONLY` | Functional table/card hybrid; not final visual; runtime publish smoke not part of audit. | P0 | Draft/published/archived filters, bulk actions, images, publish visibility accepted. |
| Product editor | PRD wireframe only | `/products/:id/edit` | `EditDraft.tsx`, `ProductEditorPanel`; product/supplier/S2BDIY APIs | `FUNCTION_ONLY` | Feature-rich but complex; visual hierarchy and error states need design pass. | P0 | Save/publish/provision/upload/variant states accepted; no silent S2BDIY failure. |
| Product categories | IA only | `/categories` | `CategoryManager.tsx`; `/admin/store-product-categories` | `FUNCTION_ONLY` | Functional tree; no final design. | P1 | Create/edit/delete/select states and empty states accepted. |
| S2B Product Import | no final design | in `/products` import workspace | `S2bImportWorkspace.tsx`; `/admin/s2b-product-import/*`, supplier catalog | `PARTIAL` | CSV preview/import/publish exists, but final UX and runtime supplier test unverified. | P0 | Export, preview, import drafts, selective publish, error CSV rows accepted. |
| CSV preview | no final design | `/products` import tab | same | `PARTIAL` | Table/validation states need final UX; no screenshots/runtime. | P0 | Invalid rows, warnings, duplicate SKUs, import disabled states. |
| Imported drafts | no final design | `/products` import tab | `/admin/s2b-product-import/drafts` | `PARTIAL` | Functional route, not final visual. | P0 | Draft list, filters, selection, status explainers. |
| Selective publish | no final design | `/products` import tab | `/admin/s2b-product-import/publish` | `PARTIAL` | API exists; publish-to-storefront runtime unverified. | P0 | Selected product ids and filter publish paths verified. |
| Orders | buyer order design can inspire only | `/orders` | `OrderList.tsx`; `/admin/orders`, push/mock APIs | `PARTIAL` | Functional; mock shipment visible; final seller order design missing. | P0 | Paid/waiting/pushed/shipped/delivered/failed states; real vs mock labels. |
| Coupons | no final seller coupon design | `/coupons` | `CouponsPage.tsx`; `/admin/store-coupons` | `PARTIAL` | Functional but runtime depends on migration; visual primitive. | P0 | Create/list/archive, eligibility, validation, buyer visibility. |
| Followers | IA only | `/followers` | `FollowersPage.tsx`; `/admin/store-followers` | `PARTIAL` | Real-ish follow count/list; no final seller UX. | P2 | List, empty, pagination/export policy accepted. |
| AI Studio | PRD wireframe | `/ai-studio/create`, `/progress/:jobId`, `/complete/:productId` | AI routes and worker | `PARTIAL` | Functional but no final visual; progress polls/health hardcode needs cleanup. | P0 | pending/running/completed/failed/retry states accepted. |
| Element Library | `Settings/Seller` IA | Missing | none | `MISSING` | IA says Element Library, Share images/text, My images/text. | P2 | Confirm if Phase 2 scope or defer. |
| Product Selection | `Settings/Seller` IA | supplier catalog routes | `/suppliers`, `/suppliers/:id/catalog`, `/supplier-catalog` redirect | `PARTIAL` | Supplier catalog exists, but IA/product-selection naming and flow differ. | P1 | Product selection route naming and S2BDIY catalog workflow accepted. |
| Design Center | `Settings/Seller` IA | product editor/design config | no standalone route | `PARTIAL` | Design center exists as embedded editor, not separate page. | P2 | Confirm standalone route vs embedded editor. |
| Publish management | `Settings/Seller` IA | products/publish actions | ProductList/EditDraft | `PARTIAL` | No dedicated publish management page. | P2 | Confirm whether Products page is enough. |
| Trends | `Settings/Seller` IA | Missing | none | `MISSING` | Notes say reference Printify; no implementation. | P3 | Defer or design trend module. |
| Store settings | no final seller design | `/settings` | `Settings.tsx`; `/admin/store-settings`, uploads | `FUNCTION_ONLY` | Functional media/policy settings; no final design; local static uploads not production storage. | P0 | Logo/banner/gallery/policies save and production storage strategy. |
| Account security | Seller settings IA | Missing dedicated route | token/logout only | `MISSING/INSECURE` | No seller security page, reset, sessions, verification, OAuth link. | P0 | Dedicated security page and backend controls. |

## Design System Audit

### Current Tokens

Buyer has `apps/storefront/src/styles/design-system.css` with `--buyer-*` tokens for background, surface, text, border, focus, primary, danger, success, warning, radius, shadow, spacing, and content width.

Seller and platform-ops use Tailwind configs with:

```text
brand: #FF6600
brand.dark: #E55A00
brand.light: #FFF4ED
surface.DEFAULT: #FFFFFF
surface.muted: #F8FAFC
font: Inter
borderRadius.card: 12px
shadow.card: 0 1px 3px rgba(15, 23, 42, 0.08)
```

### Hardcoded Colors And Spacing

Buyer still has large legacy CSS files with hardcoded `#ff5a14`, `#ef5a14`, `#e84f10`, `#ebe7e4`, `#f5f5f5`, `#fff4ee`, `18px`, `22px`, `999px`, etc. Seller pages use many inline Tailwind values such as `rounded-xl`, `bg-orange-500`, `border-slate-200`, and page-specific spacing. `@import` from Google Fonts appears in Seller/Platform Ops CSS and is not self-hosted, which violates no-CDN production hardening if external font requests are disallowed.

### Buyer/Seller Inconsistency

| Area | Buyer | Seller | Issue |
|---|---|---|---|
| Primary color | `#ef5a14` and `#ff5a14` mixed | `#FF6600` | Similar but not identical; hover differs. |
| Radius | 6/8px tokens plus many 18/22/999px hardcodes | 12px cards, rounded-lg/xl/full | Not unified; design mobile uses simple list rows and pill CTAs selectively. |
| Typography | Inter/system, many CSS-specific font sizes | Tailwind text scale | No shared typography scale. |
| Components | Buyer UI primitives and legacy classes | Seller UI primitives and Tailwind classes | Duplicated Button/Card/Input/Badge/EmptyState. |
| States | Buyer has Loading/Error/Empty components | Seller has some EmptyState/ErrorBoundary/Toast | State language and visuals differ. |
| Icons | Asset PNGs in design; code mostly text/Tailwind | No single icon library standard | Use lucide/react icon policy should be decided. |

### Target Visual Norms From Design

The buyer design is mobile-first, white background, black text, thin light gray dividers, orange active color, large tappable rows, bottom mobile nav, simple line icons, 2-column product grid, sticky bottom primary CTA, and sparse card framing. Desktop homepage has a dense product grid and utility nav.

Seller target is not visually final. Use restrained SaaS admin UI until final design: dense but scannable tables/forms, quiet surfaces, no marketing hero treatment.

### Recommended Unified Tokens

```css
:root {
  --color-primary: #ff5a14;
  --color-primary-hover: #e84f10;
  --color-primary-active: #d94d0d;
  --color-background: #f7f8fa;
  --color-surface: #ffffff;
  --color-surface-muted: #f8fafc;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --color-success: #16a34a;
  --color-warning: #f59e0b;
  --color-danger: #dc2626;
  --font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 20px;
  --font-size-xl: 24px;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 999px;
  --shadow-card: 0 1px 3px rgba(15, 23, 42, 0.08);
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

### Recommended Shared Components

Reusable: Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Stepper, Tabs, SegmentedControl, Modal, Drawer, Sheet, Card, ListRow, Table, Badge, Toast, Skeleton, EmptyState, ErrorState, ProductCard, PriceBlock, AccountNav, MobileTopBar, MobileBottomNav, FilterDrawer, OrderStatusBadge.

Do not duplicate: basic buttons, cards, badges, modal/drawer, loading/empty/error states, money display, product thumbnail, status badges, account navigation. Design-specific page composition should use shared primitives rather than copying one-off CSS.

## Real Website Experience: Remove Development/Demo Feel

| Finding | Location examples | Classification | Risk | Recommendation |
|---|---|---|---|---|
| AI mock/fallback generation | `apps/ai-worker/app/services/copy_generator.py`, image providers, `AI_WORKER_MOCK_GENERATION` | Dev fallback | High if enabled in production | Production must fail closed or clearly configure real provider; no mock art in production. |
| Mock shipment/delivery actions | `seller-dashboard/src/pages/Orders/*`, `/admin/orders/:id/mock-shipment`, `/mock-delivered` | Dev tool | High | Hide behind dev env and server-side env guard; never expose in production. |
| Static/mock fallback surfaced to buyer | `StoreHomePage.tsx`, `lib/mock-data.ts` | User-visible demo risk | High | In production, show real empty/error states, not mock products/reviews. |
| Placeholder/unavailable account settings | `account-setting-placeholders.ts` | Honest placeholder | Medium | Replace with implemented flows or explicit “coming later” only for deferred scope. |
| `alert()` in seller translate | `seller-dashboard/src/components/TranslateButton.tsx` | User-visible rough edge | Medium | Replace with toast/error component. |
| Direct console logs/warnings | scripts and backend logs; email verification dev code | Mostly dev/ops | Medium | Keep structured server logs; do not expose OTP/dev code in production. |
| Hardcoded local AI health URL | `GenerationProgress.tsx` fetches `http://127.0.0.1:8001/health` | Production risk | Medium | Use env/API proxy or remove direct local health probe. |
| Production guidance shown to users | `AccountPaymentMethods.tsx` says set env vars | User-visible technical error | Medium | Convert to user-safe message; log operator detail server-side. |
| Local uploads/static storage | `apps/medusa-backend/static/*`, upload routes | Production data risk | High | Move uploaded files to object storage/CDN before production. |
| Test scripts with live names/password env | `pay-stripe-*`, dev accounts scripts | Legit test code | Low if not deployed | Keep out of production runtime; never log secrets. |

## Authentication Audit

### Buyer Auth Status

| Capability | Status | Evidence / note |
|---|---|---|
| Current auth provider | `IMPLEMENTED` | Medusa native customer emailpass: `/auth/customer/emailpass`, `/auth/customer/emailpass/register`. |
| Login API | `IMPLEMENTED` | `signInCustomer()` creates `/auth/session`. |
| Register API | `PARTIAL` | Registers email/password then creates customer; UI still asks first/last/phone. |
| Token storage | `IMPLEMENTED` | Bearer token used in memory for session creation; not stored by buyer auth. |
| Cookie/httpOnly | `IMPLEMENTED/RUNTIME_UNVERIFIED` | `/auth/session` expected to set cookie; not runtime verified this round. |
| localStorage | `PARTIAL` | Used for cart/store/display prefs, not auth token. OK but needs privacy review. |
| Token/session expiry | `RUNTIME_UNVERIFIED` | Delegated to Medusa; no UX for expiry beyond refresh/signout. |
| Refresh/session renewal | `PARTIAL` | `getCurrentCustomer` refreshes state; no explicit renewal UX. |
| Email verification API | `PARTIAL` | `/store/customers/me/email-verification`, 6-digit code metadata TTL. |
| Resend verification | `PARTIAL` | Same send action can resend; no rate limit and no auth-flow placement. |
| Password change | `PARTIAL` | `/store/customers/me/password` for signed-in users. |
| Forgot/reset password | `MISSING` | No route/API token lifecycle found. |
| Password policy | `PARTIAL` | Min length only; register UI inconsistent. |
| Login/register rate limit | `MISSING` | No app-owned throttling found. |
| Brute-force protection | `MISSING` | No app-owned controls found. |
| CORS | `PARTIAL` | Env exists; production origins/cookie domain not finalized. |
| CSRF | `RUNTIME_UNVERIFIED` | Cookie sessions need CSRF posture for state-changing routes. |
| Logout invalidates session | `PARTIAL` | DELETE `/auth/session`; runtime invalidation not verified. |
| Buyer/Seller isolation | `PARTIAL` | Separate auth flows; buyer warns seller access not affected. Seller localStorage token remains risk. |
| Unverified checkout restriction | `MISSING` | No verified-email checkout gate found. |
| Email provider | `PARTIAL` | Resend dependency exists, but email verification does not appear to send email yet; it logs dev code. |
| Email templates | `PARTIAL` | Order/shipping/newsletter templates exist; verification/reset templates missing. |

### Seller Auth Status

| Capability | Status | Evidence / note |
|---|---|---|
| Current auth provider | `IMPLEMENTED` | Medusa user emailpass via `/auth/user/emailpass`; custom `/seller/register`. |
| Login API | `IMPLEMENTED` | `seller-dashboard/src/lib/api-client.ts`. |
| Register API | `PARTIAL` | Creates user/store/member/settings and JWT. |
| Token storage | `INSECURE` | `seller_admin_token` stored in `localStorage`. |
| Cookie/httpOnly | `MISSING` | No seller HttpOnly session flow found. |
| Token expiration | `PARTIAL/RUNTIME_UNVERIFIED` | JWT generated with config expiry; frontend clears on 401 only. |
| Refresh/session renewal | `MISSING` | No renewal flow. |
| Email verification | `MISSING` | Seller can register/login without verification. |
| Password reset | `MISSING` | No seller reset route. |
| Password policy | `PARTIAL` | Min 8 chars only. |
| Login/register rate limit | `MISSING` | No app-owned throttling. |
| CORS | `PARTIAL` | Admin/auth CORS env exists; production exact origins needed. |
| CSRF | `PARTIAL` | Bearer header reduces CSRF, increases XSS token theft risk. |
| Logout invalidation | `INSECURE/PARTIAL` | Clears localStorage only; server token remains valid until expiry. |
| Buyer/Seller identity isolation | `PARTIAL` | Store-member/session lookup exists; OAuth/account linking not defined. |
| Unverified seller publish restriction | `MISSING` | No verified seller email gate before publishing. |

## Google Login Design

Recommendation: implement Google login in the Medusa backend, not purely in frontend. Buyer and Seller should use separate callback routes and separate OAuth clients unless Google Console/domain constraints strongly favor one client. Separate clients reduce accidental seller access and simplify consent screen/app labeling.

### Proposed Flow

```text
Google Sign-In button
-> backend creates authorization URL for buyer or seller
-> Google OAuth authorization
-> callback to backend
-> backend exchanges authorization code
-> backend verifies Google identity
-> backend finds existing auth identity/account
-> link or create local buyer/seller account
-> create local session in secure HttpOnly cookie
-> redirect to storefront/seller dashboard
-> first login completes missing profile/store info
```

### Callback Routes

| Surface | Start route | Callback route | Redirect after success |
|---|---|---|---|
| Buyer | `GET /auth/google/buyer/start` | `GET /auth/google/buyer/callback` | `${STOREFRONT_URL}/account` or return URL |
| Seller | `GET /auth/google/seller/start` | `GET /auth/google/seller/callback` | `${SELLER_DASHBOARD_URL}/` or onboarding |

### Environment Variables

Backend only:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_BUYER_REDIRECT_URI
GOOGLE_SELLER_REDIRECT_URI
GOOGLE_OAUTH_ALLOWED_DOMAINS(optional)
OAUTH_STATE_SECRET
```

Frontend-safe:

```text
VITE_GOOGLE_AUTH_ENABLED
STOREFRONT_URL / VITE_STOREFRONT_URL (public URL only)
SELLER_DASHBOARD_URL / VITE_SELLER_DASHBOARD_URL (public URL only)
```

Backend/public depending on current env convention:

```text
STOREFRONT_URL
SELLER_DASHBOARD_URL
MEDUSA_BACKEND_URL
```

Never expose `GOOGLE_CLIENT_SECRET`, `OAUTH_STATE_SECRET`, JWT secrets, cookie secrets, Stripe secret keys, S2BDIY secrets, or Resend API keys to frontend bundles.

### Callback Domain Matrix

| Env | Buyer callback | Seller callback |
|---|---|---|
| Local | `http://127.0.0.1:9000/auth/google/buyer/callback` | `http://127.0.0.1:9000/auth/google/seller/callback` |
| Staging | `https://api.staging.ciiverse.com/auth/google/buyer/callback` | `https://api.staging.ciiverse.com/auth/google/seller/callback` |
| Production | `https://api.ciiverse.com/auth/google/buyer/callback` | `https://api.ciiverse.com/auth/google/seller/callback` |

Google Console must configure authorized redirect URIs, JavaScript origins for frontend domains if using button SDK, OAuth consent screen, app name/logo/support email/privacy/terms URLs, test users for staging, and publishing status.

### Account Linking Rules

1. If Google sub already linked to a buyer auth identity, sign in that buyer.
2. If Google email matches an existing email/password buyer and email is Google-verified, link after either signed-in confirmation or email ownership policy confirmation.
3. If no buyer exists, create a customer with email, verified email metadata, and minimal profile.
4. Seller callback must never sign into buyer account. If email belongs only to buyer, ask to create seller store or deny until seller onboarding.
5. If Google email matches existing seller email/password, require signed-in seller confirmation or secure email verification before linking.
6. Deleted/deactivated accounts should block auto-recreation and show account recovery/support path.
7. User cancellation returns to the originating login page with safe error code, not raw provider error.
8. Logout only clears local Ciiverse session by default; do not attempt global Google logout.

### Security Risks

Use signed `state` with nonce, return URL allowlist, PKCE if supported, ID token signature/audience/issuer checks, Google `email_verified`, CSRF protection, separate buyer/seller actor types, account takeover protections for matching email, and audit logs for linking/unlinking.

### Test Plan

Local and staging tests should cover: first buyer login, existing buyer link, first seller login/onboarding, existing seller link, buyer email attempting seller dashboard, cancelled authorization, invalid state, expired state, reused code, deleted account, logout, and callback domain mismatch. Do not use production OAuth client secrets in local.

## Deployment Maturity Audit

### Current Findings

| Area | Current state | Gap |
|---|---|---|
| PostgreSQL | Docker local/prod compose exists. | Production backup restore drill and migration rollback policy need operational proof. |
| Redis | Configured in Medusa and compose. | Queue/background job strategy still basic. |
| Migrations | Scripts exist and prod deploy fails hard on migrations. | Current audit did not execute migrations; local DB drift risk remains. |
| Seed | Seed scripts exist. | Production seed policy must avoid demo/test data. |
| Environment variables | `.env.example` exists across apps. | Needs staged/prod env matrix, secret manager, exact domain/cookie/OAuth values. |
| Docker | Backend/storefront/seller/ai-worker Dockerfiles and prod compose exist. | Reverse proxy/TLS/CDN not in repo. |
| Static assets/uploads | Local static dirs and AI upload volume. | Need object storage/CDN for product images, banners, AI files. |
| Stripe | Secret/publishable/webhook env; provider wiring. | Need test/staging/prod mode separation, webhook domain, smoke gates. |
| Email | Resend dependency and env. | Verification/reset emails and domain authentication not complete. |
| S2BDIY | Mock/live env modes and scripts. | No production credential rotation/runbook; no real order call in this audit. |
| AI provider | Multi-provider envs and mock mode. | Cost controls, quotas, content moderation and production failover need policy. |
| Logging | Console logs and some structured-ish messages. | Central logging, PII redaction and error monitoring missing. |
| Health checks | `/health`, compose health checks, deploy checks. | Need full smoke after deploy including auth/cart/checkout/supplier read-only. |
| Rate limit | Not found. | Required for auth, checkout, coupon, AI, upload. |
| Secrets management | `.env` convention. | Use managed secret store; remove real secrets from files/logs. |
| CI/CD | PR template exists; no workflow observed in `.github` besides template. | Need CI workflows for typecheck/test/build/migration dry-run. |
| Legal/privacy | Terms/privacy/cookies content exists; delete account doc exists. | Account deletion implementation and data retention process missing. |

### Environment Matrix

| Env | Services | URL | Required env | DB/Redis | Storage | Stripe | OAuth | Email | Supplier/AI | Release gates |
|---|---|---|---|---|---|---|---|---|---|---|
| Local development | Postgres, Redis, Medusa, storefront, seller, ai-worker | `127.0.0.1` ports 9000/5174/5173/8001 | `.env.example` copied; dev secrets only | Docker local | local `static/`, AI upload dir | test or disabled | local callback | Resend optional; dev code acceptable only non-prod | S2BDIY mock by default, AI mock allowed | typecheck, unit tests, no real payment/order. |
| Staging | Same plus reverse proxy/TLS | `https://staging...` | staging secrets, exact CORS/cookie domains, Google/Stripe test mode | managed/staging DB + Redis | object storage staging bucket + CDN | Stripe test mode + staging webhook | staging callback | verified staging sender/domain | S2BDIY sandbox/test, AI low quota | migration, build, auth/cart/checkout test payment, read-only supplier smoke. |
| Production | Same plus monitoring/backups | `https://ciiverse.com`, `https://seller.ciiverse.com`, `https://api.ciiverse.com` | production secrets via secret manager | managed DB/Redis with backups | prod object storage/CDN | Stripe live + webhook | production callback | verified production sender/domain | S2BDIY live only with guarded order flow, real AI provider | clean git, backup, migration, health, smoke, rollback plan, monitoring. |

## Implementation Roadmap

| Phase | Goal | Directories | Dependencies | Risk | Test method | Acceptance | Human confirmation | Commit split |
|---|---|---|---|---|---|---|---|---|
| Phase 0 | Confirm final design versions | design folders, `docs/` | User/design owner | Medium | Static review checklist | Final page list and version decisions recorded | Required | docs only |
| Phase 1 | Unified design tokens/components | `apps/storefront/src/styles`, `apps/*/src/components/ui`, maybe shared package | Phase 0 | Medium | typecheck, visual smoke later | Buyer/Seller use same color/radius/type/state primitives | Yes for visual tokens | tokens, primitives, migration page-by-page |
| Phase 2 | Login/Register/Email Verification/Password Reset | storefront auth pages, Medusa auth routes, email lib | Resend/domain, security policy | High | unit/API tests, local email stub | Email-only signup, verify/resend, forgot/reset, safe errors | Required | buyer auth UI, backend reset, email templates, tests |
| Phase 3 | Google Login | Medusa auth routes, buyer/seller login UI | Google Console, callback domains | High | local/staging OAuth test users | Buyer/seller separated OAuth sessions and linking rules | Required | backend OAuth, buyer UI, seller UI, tests |
| Phase 4 | Buyer core page UI alignment | storefront home/PDP/cart/checkout/orders | tokens/components | High | screenshots in next implementation round only | Mobile and desktop core flows match target | Confirm ambiguous states | page clusters |
| Phase 5 | Seller core page UI alignment | seller-dashboard pages/components | seller design decision | Medium | typecheck, later screenshots | Functional admin UI is consistent and scannable | Required for final seller style | login/dashboard/products/orders/settings |
| Phase 6 | Empty/error/loading/responsive | buyer/seller shared states | phases 1,4,5 | Medium | component tests, manual responsive later | No broken/technical/demo states | No unless copy tone changes | state components, per-page fixes |
| Phase 7 | Staging deployment | infra, scripts, env docs | domains, secrets, storage | High | staging smoke | Staging release gate passes without real payments/orders | Required | infra docs, env, CI |
| Phase 8 | Production security/deploy | infra, backend, auth, monitoring docs | staging proven | High | release checklist | Backup, migration, health, rollback, monitoring, legal gates | Required | security hardening, production runbook |

## First Batch Recommended Changes

1. Confirm final design version set, especially seller dashboard desktop design and whether `Settings/Seller` is IA only.
2. Align Buyer login/register with final auth design: email+password only for register, add forgot password entry, remember me, terms/privacy, and Google button placeholder behind feature flag.
3. Implement forgot/reset password backend and email templates before OAuth.
4. Move buyer email verification from hidden/partial account security into post-register/login flow; add resend and checkout gating policy.
5. Replace seller `localStorage` bearer token with a safer server session strategy or at minimum shorten expiry and add XSS hardening/rate limits before production.
6. Start design tokens/component unification before page-by-page visual polish.
7. Remove production-visible demo/fallback text and env setup instructions from buyer-facing UI.
8. Define staging env matrix and object storage/CDN plan before production deploy.

## Questions Requiring Human Confirmation

1. Which design set is final when `citigoo 买家端页面` and `part 5` overlap? My recommendation: use `part 5` as current, but mark conflicts as `NEED_CONFIRMATION`.
2. Is Seller `Settings/Seller/mobile_2_2_1.png` only information architecture, or should it drive an actual mobile seller surface?
3. Should product detail always replace purchase CTAs with `Design Now`, or only for customizable/POD products?
4. Is guest checkout allowed after email verification is introduced, or should verification be required only for logged-in buyers?
5. Should unverified sellers be blocked from publish, S2BDIY push, or both?
6. Should Plans remain display/metadata for MVP, or become real Stripe subscription before production?
7. Which domains will be used for production: storefront, seller dashboard, backend API, CDN, email sender?
8. Should Google OAuth use separate buyer/seller clients, as recommended, or one shared client?
