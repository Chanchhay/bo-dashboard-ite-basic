# POS Backend Build Plan

Scope: everything the POS terminal (`/pos`) and Sale Management (`/sales`) need from
the Spring API. Derived from `api-docs/api.json` (`Fluxipos v1`, OpenAPI 3.1.0).

All paths are relative to the existing base and inherit the global `bearerAuth`
(JWT) security scheme. All business-scoped paths follow the established
`/api/v1/businesses/{businessId}/…` convention.

## Legend

| Priority | Meaning |
|---|---|
| **Blocking** | The UI cannot be built correctly without it. Build first. |
| **Hardening** | The UI can be built, but shipping without it is a defect. |
| **Deferred** | Stub the UI now, build the endpoint later. |

## Contents

- [0. Cross-cutting decisions](#0-cross-cutting-decisions)
- [1. Idempotency](#1-idempotency--blocking)
- [2. Order list](#2-order-list--blocking)
- [3. Mutable open orders](#3-mutable-open-orders--blocking)
- [4. Cart quote](#4-cart-quote--blocking)
- [5. Server-side discounts and coupons](#5-server-side-discounts-and-coupons--blocking)
- [6. Registers and sessions](#6-registers-and-sessions--blocking)
- [7. Item lookup for the product grid](#7-item-lookup-for-the-product-grid--blocking)
- [8. Sales list](#8-sales-list--hardening)
- [9. Refund and void](#9-refund-and-void--hardening)
- [10. Staff PIN](#10-staff-pin--hardening)
- [11. Business-scoped feature flags](#11-business-scoped-feature-flags--hardening)
- [12. Customers](#12-customers--deferred)
- [13. Analytics](#13-analytics--deferred)
- [14. Split tender](#14-split-tender--deferred)
- [15. Permissions catalog](#15-permissions-catalog)
- [Build order](#build-order)
- [Appendix A: what already works](#appendix-a-what-already-works)

---

## 0. Cross-cutting decisions

No new endpoints, but each of these changes multiple schemas. Settle them before
writing code, because retrofitting any one of them touches every layer.

### 0.1 Naming collision — `RegisterRequest`

`RegisterRequest` / `RegisterResponse` already mean **user signup** in the current
spec (`POST /api/v1/auth/register`, with `username` / `password` /
`confirmPassword` / `role`). The cash-register entity must not reuse those names.

Use `CashRegisterResponse` / `CreateCashRegisterRequest` / `UpdateCashRegisterRequest`.

### 0.2 Money representation

Every money field in the spec is currently JSON `number` (`subtotal`, `total`,
`unitPrice`, `receivedAmount`, `changeAmount`, `openingBalance`, …).

With KHR (zero-decimal) and USD (2-decimal) both configurable per business via
`/businesses/{businessId}/currencies`, IEEE-754 doubles will drift on percentage
discounts and change calculation. Pick one:

- **String decimals** — `"12.50"`, backed by `BigDecimal`. Least disruptive to the
  current schema shape.
- **Integer minor units** — `1250` plus an explicit `scale`. Immune to drift but
  changes every client formatter.

Whichever is chosen, publish per-currency `scale` and `roundingMode` on
`BusinessCurrencyResponse`, and define where rounding happens when a percentage
discount is split across lines.

### 0.3 Business timezone

`BusinessResponse` has no timezone field. Without it, "today's sales", shift
day-boundaries, and every report grouped by day are wrong for any business not
running on server time.

Add `timeZone` (IANA, e.g. `Asia/Phnom_Penh`) to `BusinessResponse` and
`UpdateBusinessRequest`.

### 0.4 Stock semantics

Not determinable from the current spec. Specify explicitly:

- Stock decrements on transition to **`PAID`**, not on order creation. A parked
  ticket must not hold stock.
- `PHYSICAL` items only. `SERVICE` and `DIGITAL` skip stock entirely.
- Every decrement writes a `StockEntry` with reason `SALE` referencing the order,
  so the ledger reconciles against sales.
- Oversell: reject with `409 INSUFFICIENT_STOCK`, gated by a business setting
  `allowNegativeStock` (default `false`).
- Cancelling a `PENDING` order changes no stock. Refund restocks with reason
  `REFUND`.

### 0.5 Session ↔ order linkage

`RegisterSessionResponse.totalCashSales` implies the backend already attributes
cash sales to a session, but neither `CreateOrderRequest` nor `PayOrderRequest`
carries a `sessionId`.

- The server derives the session from the authenticated cashier's open session.
  The client must not supply it.
- A `CASH` payment with no open session is rejected `409 NO_OPEN_SESSION`.
- Add `sessionId` to `OrderResponse` and `SaleResponse` so the UI can scope the
  receipts tab to the current shift.

### 0.6 Machine-readable error codes

`ErrorResponse` currently carries `message` only. The UI must branch on failure:
insufficient stock opens a different dialog than an expired coupon.

Add a stable `code` field, and keep `message` as the human-readable fallback:

```
INSUFFICIENT_STOCK        NO_OPEN_SESSION         SESSION_ALREADY_OPEN
SESSION_HAS_OPEN_ORDERS   ORDER_NOT_PENDING       ORDER_VERSION_CONFLICT
COUPON_INVALID            COUPON_EXPIRED          COUPON_USAGE_EXCEEDED
COUPON_MIN_NOT_MET        DISCOUNT_NOT_ELIGIBLE   PIN_LOCKED
PIN_INVALID               IDEMPOTENCY_CONFLICT    REFUND_EXCEEDS_SALE
```

---

## 1. Idempotency — Blocking

Accept an `Idempotency-Key` request header on:

```
POST  /api/v1/businesses/{businessId}/orders
PATCH /api/v1/businesses/{businessId}/orders/{orderId}/pay
POST  /api/v1/businesses/{businessId}/sales/{saleId}/refund
```

Store `key → (status, response body)` for 24 hours, scoped per business. A repeat
with the same key replays the stored response instead of re-executing. A repeat
with the same key but a *different* request body is rejected
`409 IDEMPOTENCY_CONFLICT`.

Highest value in this document relative to cost. Without it, a double-tapped Pay
button or a retry over flaky café wifi charges the customer twice — and with no
refund endpoint (§9), that double charge is unrecoverable through the API.

---

## 2. Order list — Blocking

```
GET /api/v1/businesses/{businessId}/orders
```

**Query:** `page`, `size`, `sort`, `status` (repeatable), `channel`, `from`, `to`,
`cashierId`, `sessionId`, `customerId`, `keyword` (matches `invoiceNumber` or `note`)

**Returns:** `PagedModelOrderSummaryResponse`

```
OrderSummaryResponse:
  id                string
  invoiceNumber     string
  channel           POS | TELEGRAM | MESSENGER | WEB
  status            PENDING | PAID | FAILED | CANCELLED
  note              string       # the table / customer name on POS ticket cards
  itemCount         integer
  subtotal          money
  discountAmount    money
  total             money
  currency          string
  cashierId         string
  cashierName       string
  customerName      string
  sessionId         integer
  createdDate       date-time
  updatedDate       date-time
```

Line items are deliberately omitted: the open-tickets grid renders 20+ cards at
once, and `GET /orders/{orderId}` remains the full-detail read.

Only `POST /orders` and `GET /orders/{orderId}` exist today, so there is currently
no data source for the POS open-tickets tab or the Sale Management orders page.
This one endpoint unblocks both.

---

## 3. Mutable open orders — Blocking

The largest gap in the current API. An order is created complete and can then only
be paid or cancelled — there is no update path. The POS flow requires parking a
ticket, naming it, returning to it, and editing its lines. That is currently
impossible to express.

```
PUT   /api/v1/businesses/{businessId}/orders/{orderId}
PATCH /api/v1/businesses/{businessId}/orders/{orderId}
```

**`PUT`** replaces the item set wholesale. Body is the `CreateOrderRequest` shape
minus `channel`; totals and discounts are recomputed server-side. Wholesale
replacement rather than line-level endpoints keeps the client cart authoritative
and makes the operation naturally idempotent.

**`PATCH`** updates `note` and `customerId` only, so renaming a ticket does not
resend every line.

Both reject with `409 ORDER_NOT_PENDING` unless status is `PENDING`.

Add a `version` integer to `OrderResponse`, required on `PUT`. Two terminals
editing the same parked ticket must not silently clobber each other — mismatch is
`409 ORDER_VERSION_CONFLICT`.

---

## 4. Cart quote — Blocking

```
POST /api/v1/businesses/{businessId}/orders/quote
```

Body is the `CreateOrderRequest` shape. Persists nothing, creates nothing.

**Returns:** `OrderQuoteResponse`

```
OrderQuoteResponse:
  subtotal          money
  discountAmount    money
  total             money
  currency          string
  items[]           { itemId, variantId, quantity, unitPrice,
                      discountAmount, lineTotal }
  appliedDiscounts[] { discountId, name, type, value, amount, couponCode? }
  warnings[]        { code, message, itemId? }   # LOW_STOCK, COUPON_INVALID, …
```

The cart panel recalculates on every quantity change. Without this endpoint there
are only two options, both bad: the client reimplements the discount engine and
drifts from the server, or it creates and abandons throwaway orders.

---

## 5. Server-side discounts and coupons — Blocking

`CreateOrderRequest` currently accepts a flat, client-supplied `discountAmount`.
A cashier can post any value. Meanwhile `DiscountResponse` already models
`PERCENTAGE` / `FIXED_AMOUNT` / `BUY_X_GET_Y` with `ruleType`, `scope`,
`minOrderAmount`, `maxDiscountAmount`, `requiresCoupon`, and `selectedDay` — none
of which can be enforced client-side.

Replace `discountAmount` on `CreateOrderRequest` (and the `PUT` body from §3) with:

| Field | Behaviour |
|---|---|
| `couponCode: string?` | Server resolves, validates window, `usageLimit`, `usageLimitPerCustomer`, `minPurchaseAmount`. |
| `discountIds: string[]?` | Manually applied discounts; server validates `scope` and eligibility. |
| `manualDiscountAmount: money?` | Cashier discretion. Requires `order:discount-override`. Written to audit log. |

`OrderResponse` gains `appliedDiscounts[]` in the same shape as §4, and
`OrderItemResponse.discountAmount` must be populated per line.

Coupon `usedCount` increments **on payment**, not on order creation, and the
increment must be atomic — otherwise a limited coupon oversells across concurrent
tills. Define stacking rules explicitly (can two `discountIds` combine? does a
coupon stack with a manual discount?).

---

## 6. Registers and sessions — Blocking

`POST /registers/{registerId}/sessions/open` exists, but nothing creates a
register, nothing lists them, and nothing reports which session is currently
open — so a page refresh loses the shift.

### 6.1 Register CRUD

```
GET    /api/v1/businesses/{businessId}/registers
POST   /api/v1/businesses/{businessId}/registers
GET    /api/v1/businesses/{businessId}/registers/{registerId}
PUT    /api/v1/businesses/{businessId}/registers/{registerId}
PATCH  /api/v1/businesses/{businessId}/registers/{registerId}/activate
PATCH  /api/v1/businesses/{businessId}/registers/{registerId}/deactivate
```

```
CashRegisterResponse:
  id                integer
  businessId        string
  name              string
  code              string
  location          string
  status            ACTIVE | INACTIVE
  currentSessionId  integer?     # null when closed
  createdAt         date-time
```

### 6.2 Current session

```
GET /api/v1/businesses/{businessId}/sessions/current   → RegisterSessionResponse | 204
GET /api/v1/registers/{registerId}/sessions/current    → RegisterSessionResponse | 204
GET /api/v1/businesses/{businessId}/sessions           → paged shift history
```

`/businesses/{businessId}/sessions/current` resolves from the authenticated
cashier and is what makes a browser refresh survive. Until it exists, the
frontend has to stash `sessionId` in an httpOnly cookie and validate it against
`/sessions/{sessionId}/summary` — a workaround, not a design.

### 6.3 Invariants

- At most one open session per cashier, and one per register. Double open is
  `409 SESSION_ALREADY_OPEN`.
- `POST /sessions/{sessionId}/close` rejects `409 SESSION_HAS_OPEN_ORDERS` while
  any order on that session is still `PENDING` — or define explicitly what
  happens to them (auto-cancel? transfer?).
- Add `sessionId` to `CashMovementResponse` consumers so the close screen can
  reconcile: `openingBalance + totalCashSales + totalPaidIn − totalPaidOut =
  expectedAmount`.

---

## 7. Item lookup for the product grid — Blocking

`GET /api/v1/sales-channels/{channelCode}/items` takes only `channelCode` —
unpaged, no keyword, no category filter. Unusable as a till grid past a few dozen
items.

**Cheapest fix:** add `channelCode` to `ItemSearchFilter` and use the existing
`POST /api/v1/businesses/{businessId}/items/filter`, which already accepts
`pageable`. Preferable to building a second paging implementation on the channel
endpoint.

Two related gaps:

- `GET /api/v1/businesses/{businessId}/stock-entries/current` returns
  `StockSummaryResponse[]` for the **entire catalog**. Add an `itemIds` filter (or
  paging) so the grid fetches stock only for the visible page.
- `ItemVariantResponse` has no `barcode`. If a cashier scans a specific size or
  colour, variants need their own barcodes and
  `GET /items/barcode/{barcode}` must resolve to `(item, variant)`. Decide before
  the scan-to-cart path is written — the frontend already has `react-barcode`
  and a working barcode BFF route.

---

## 8. Sales list — Hardening

```
GET /api/v1/businesses/{businessId}/sales           → PagedModelSaleResponse
GET /api/v1/businesses/{businessId}/sales/{saleId}  → SaleResponse
```

**Query:** `page`, `size`, `sort`, `from`, `to`, `cashierId`, `sessionId`,
`paymentMethod`, `channel`, `keyword`

`SaleResponse` already exists as a schema but nothing returns a collection of
them. This backs the POS Receipts tab and every revenue figure.

Hardening rather than Blocking only because the POS receipts tab can be driven by
§2 filtered to `status=PAID`. Reporting still wants the sale projection, which
carries `totalCost`, `paidAmount`, and `changeAmount` that the order does not.

---

## 9. Refund and void — Hardening

```
POST  /api/v1/businesses/{businessId}/sales/{saleId}/refund
PATCH /api/v1/businesses/{businessId}/sales/{saleId}/void
```

**Refund body:** `items[]` (omit for a full refund), `reason`, `refundMethod`,
`Idempotency-Key` header.

Behaviour: restocks per §0.4, writes a negative cash movement when the refund is
cash, links to the original sale, requires `order:refund`, and is audited. Reject
`409 REFUND_EXCEEDS_SALE` when cumulative refunds would exceed `totalAmount`.

Void is the same-day-mistake path and may be a simpler full reversal.

There is currently no way to reverse a sale at all. Combined with the missing
idempotency key (§1), a double charge today cannot be undone.

---

## 10. Staff PIN — Hardening

```
PUT    /api/v1/businesses/{businessId}/staff/{userId}/pin    body { pin }
DELETE /api/v1/businesses/{businessId}/staff/{userId}/pin
POST   /api/v1/businesses/{businessId}/staff/pin/verify      body { pin }
```

- Store a BCrypt hash. Never store or return the PIN.
- Add `hasPin: boolean` to `StaffResponse` so the UI knows whether to offer the
  lock screen.
- Rate limit to 5 attempts, then `423 PIN_LOCKED` for 15 minutes.

**Critical constraint:** verify is a **screen unlock, not a login**. It operates on
an already-authenticated Keycloak session and must never mint one. The frontend
treats `/pos/lock` as a lock over a live session, consistent with this.

Until this exists the PIN pad is decorative — any valid session satisfies it.

---

## 11. Business-scoped feature flags — Hardening

`GET` / `PATCH /api/v1/admin/businesses/{businessId}/features` is platform-admin
scoped, so a store owner cannot read their own flags.

```
GET /api/v1/businesses/{businessId}/features   → BusinessFeatureResponse[]
```

Add `POS` to the `BusinessFeature` enum (currently
`STOREFRONT | TELEGRAM_BOT | KHQR_PAYMENT`) if POS is meant to be toggleable per
store.

Keep the mutating `PATCH` admin-only — a business should not grant itself
features — unless self-service enablement is wanted, in which case add a
business-scoped `PATCH` restricted to a self-serviceable subset.

---

## 12. Customers — Deferred

```
GET    /api/v1/businesses/{businessId}/customers
POST   /api/v1/businesses/{businessId}/customers
GET    /api/v1/businesses/{businessId}/customers/{customerId}
PUT    /api/v1/businesses/{businessId}/customers/{customerId}
DELETE /api/v1/businesses/{businessId}/customers/{customerId}
GET    /api/v1/businesses/{businessId}/customers/search?keyword=
```

```
CustomerResponse:
  id, name, phoneNumber, email,
  membershipTypeId, note, status, createdAt
```

`CreateOrderRequest.customerId` already exists but is unusable because nothing
creates a customer. This also blocks `SPECIFIC_MEMBERSHIP`-scoped discounts —
`membership-types` CRUD exists with no member records behind it — and digital
receipt delivery. Search by phone number is the till lookup path.

---

## 13. Analytics — Deferred

```
GET /api/v1/businesses/{businessId}/analytics/summary?from=&to=
GET /api/v1/businesses/{businessId}/analytics/sales-series?from=&to=&interval=DAY|HOUR
GET /api/v1/businesses/{businessId}/analytics/top-items?from=&to=&limit=
```

```
AnalyticsSummaryResponse:
  grossSales, netSales, discountTotal, refundTotal,
  orderCount, averageOrderValue, itemsSold,
  byPaymentMethod[], byChannel[], byHour[]
```

`GET /api/v1/admin/dashboard` is platform-scoped and not a substitute. Day
bucketing depends on the business timezone from §0.3.

---

## 14. Split tender — Deferred

`PayOrderRequest` has a single `receivedAmount` and a single `paymentMethod`.
Split tender — part USD, part KHR, or cash plus card — is normal in Cambodian
retail and cannot currently be expressed.

If in scope, replace with `payments[]`:

```
payments[]: { method, currency, amount, exchangeRate }
```

and return change in the currency the business settles in. If out of scope, state
so explicitly so the UI does not imply it.

---

## 15. Permissions catalog

The frontend maps Keycloak client roles to UI permissions in
`src/lib/permissions.ts`, parsing them as `resource:action`. It currently reads
`order:read`, `order:create`, `order:pay`, `order:cancel`, `order:generate-khqr`.

New permissions must be published in the same `resource:action` form, or the
mapping silently grants nothing:

```
order:update              order:refund             order:discount-override
sale:read                 register:manage          register:open
register:close            cash-movement:create     customer:read
customer:create           customer:update          analytics:read
staff:pin-manage
```

Any new resource prefix also needs a corresponding branch added to
`permissionsForRoles` on the frontend.

---

## Build order

| Phase | Items | Rationale |
|---|---|---|
| 1 | §0 decisions, §0.6 error codes | Mostly paperwork; unblocks everything and prevents rework. |
| 2 | §1 idempotency | Cheapest correctness win. Do before any real money flows. |
| 3 | §2 order list, §3 order update | Unblocks open tickets and the orders page. |
| 4 | §4 quote, §5 discounts | Moves money math server-side. |
| 5 | §6 registers and sessions | Makes a shift survive a refresh. |
| 6 | §7 item lookup, stock filtering | Makes the product grid usable at scale. |
| 7 | §8 sales list | Receipts tab and revenue figures. |
| 8 | §9 refund, §10 PIN, §11 flags | Hardening before real use. |
| 9 | §12 customers, §13 analytics, §14 split tender | Feature expansion. |

Phases 1–6 should be in place before the POS UI is built in earnest. Everything
after that the frontend can stub cleanly.

---

## Appendix A: what already works

Do not rebuild these — the POS UI plan depends on them as-is.

**Checkout happy path**

```
POST  /api/v1/businesses/{businessId}/orders                        # channel: POS
PATCH /api/v1/businesses/{businessId}/orders/{orderId}/pay          # CASH + receivedAmount
                                                                    # → SaleResponse.changeAmount
PATCH /api/v1/businesses/{businessId}/orders/{orderId}/cancel
```

**KHQR / digital payment**

```
POST  /api/v1/businesses/{businessId}/orders/{orderId}/khqr           → KhqrResponse
GET   /api/v1/businesses/{businessId}/orders/{orderId}/payment-status → PaymentStatusResponse
GET   /api/v1/businesses/{businessId}/orders/{orderId}/receipt        → ReceiptResponse
PATCH /api/v1/businesses/{businessId}/orders/{orderId}/receipt/print
```

`KhqrResponse` carries `qr`, `qrImage`, `md5`, `expiresAt`; `PaymentStatusResponse`
carries both `orderStatus` and `qrStatus` plus `paid` — enough for a full polling
UI.

**Shift lifecycle** (given §6 fills the gaps)

```
POST /api/v1/registers/{registerId}/sessions/open    # OpenSessionRequest.openingBalance
GET  /api/v1/sessions/{sessionId}/cash-movements
POST /api/v1/sessions/{sessionId}/cash-movements     # PAID_IN | PAID_OUT
GET  /api/v1/sessions/{sessionId}/summary
POST /api/v1/sessions/{sessionId}/close              # CloseSessionRequest.actualAmount
```

`RegisterSessionResponse` already returns `expectedAmount`, `actualAmount`,
`differenceAmount`, and `reconciliationStatus` — the close-register screen maps
onto it almost field-for-field.

**Catalog** — items, item-groups, variants, images, barcode lookup and barcode
image generation, stock entries, units. Already fully wired through the
frontend BFF (`/api/inventory/*`), so the POS product grid and scan-to-cart need
no new backend work beyond §7.

**Configuration** — discounts, coupons, membership types, currencies, staff,
roles and permissions, business profile, Bakong payment settings, Telegram bot,
storefront slug.

**Auth** — Keycloak OIDC with PKCE (public client, no secret). Tokens never reach
the browser: the Next.js BFF holds the session in an httpOnly cookie and injects
`Authorization: Bearer` server-side.
