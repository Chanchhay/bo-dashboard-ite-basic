POS Backend Work Order
Everything below is scoped to what the POS terminal and Sale Management need. I've marked each item as Blocking (UI cannot be built correctly without it), Hardening (UI can be built, but shipping without it is a defect), or Deferred (stub the UI, build later).

0. Decisions to settle first — no new endpoints, but they change every schema
Naming collision. RegisterRequest / RegisterResponse already mean user signup in your spec (POST /api/v1/auth/register, fields username/password/confirmPassword). The cash-register entity cannot reuse those names. Use CashRegisterResponse / CreateCashRegisterRequest. Get this right before code exists in two places.

Money representation. All money fields are currently JSON number. With KHR (zero-decimal) and USD (2-decimal) in the same business, floats will drift on discount splits and change calculation. Decide now: string decimals ("12.50") or integer minor units, plus explicit scale and rounding mode per currency. Retrofitting this later touches every schema and every UI formatter.

Business timezone. BusinessResponse has no timezone field. Without it, "today's sales", shift day-boundaries, and any report grouped by day are wrong for anyone not on server time. Add timeZone (IANA, e.g. Asia/Phnom_Penh).

Stock semantics. Currently unspecified — I could not determine from the spec whether stock moves on order creation or on payment. Specify:

Decrement on transition to PAID, not on order creation. A parked ticket must not hold stock.
PHYSICAL items only; SERVICE and DIGITAL skip.
Every decrement writes a StockEntry with reason SALE referencing the order, so the ledger reconciles.
Oversell policy: reject with 409 INSUFFICIENT_STOCK, gated by a business setting allowNegativeStock (default false).
Cancelling a PENDING order changes nothing. Refund restocks with reason REFUND.
Session ↔ order linkage. RegisterSessionResponse.totalCashSales implies the backend already attributes cash sales to a session, but CreateOrderRequest and PayOrderRequest carry no sessionId. Specify: the server derives the session from the authenticated cashier's open session, and rejects a CASH payment with 409 NO_OPEN_SESSION when there isn't one. Add sessionId to OrderResponse and SaleResponse so the UI can scope the receipts tab to the current shift.

Machine-readable error codes. ErrorResponse currently carries message only. The UI has to branch on failure — insufficient stock shows a different dialog than an expired coupon. Add a stable code field: INSUFFICIENT_STOCK, NO_OPEN_SESSION, SESSION_ALREADY_OPEN, ORDER_NOT_PENDING, COUPON_INVALID, COUPON_EXPIRED, COUPON_USAGE_EXCEEDED, PIN_LOCKED, IDEMPOTENCY_CONFLICT.

1. Idempotency — Blocking
Accept an Idempotency-Key header on POST /orders and PATCH /orders/{orderId}/pay. Store key → response for 24h; a repeat replays the original response instead of re-executing.

This is the highest-value item in the whole document relative to its cost. Without it, a double-tapped Pay button or a retry over flaky wifi charges the customer twice, and there is no refund endpoint to undo it.

2. Order list — Blocking

GET /api/v1/businesses/{businessId}/orders
Query: page, size, sort, status (repeatable), channel, from, to, cashierId, sessionId, customerId, keyword (matches invoiceNumber or note)

Returns PagedModelOrderSummaryResponse. New schema, deliberately lighter than OrderResponse:


OrderSummaryResponse:
  id, invoiceNumber, channel, status, note,
  itemCount, subtotal, discountAmount, total, currency,
  cashierId, cashierName, customerName, sessionId,
  createdDate, updatedDate
Line items are omitted because the open-tickets grid renders 20+ cards at once; GET /orders/{orderId} stays the full-detail read. This single endpoint unblocks the POS open-tickets tab and the Sale Management orders page.

3. Mutable open orders — Blocking
This is the largest gap in the current API. Today an order is created complete and can then only be paid or cancelled — there is no update path. But the POS flow requires parking a ticket, naming it (table or customer name), returning to it, and editing its lines. That flow is currently impossible.


PUT   /api/v1/businesses/{businessId}/orders/{orderId}
PATCH /api/v1/businesses/{businessId}/orders/{orderId}
PUT replaces the item set wholesale — body is the CreateOrderRequest shape minus channel — and recomputes totals. Wholesale replacement rather than line-level endpoints keeps the client cart authoritative and the operation naturally idempotent.

PATCH updates note and customerId only, so renaming a ticket doesn't resend every line.

Both reject with 409 ORDER_NOT_PENDING unless status is PENDING. Add a version field for optimistic locking — two terminals editing the same parked ticket must not silently clobber each other.

4. Cart quote — Blocking

POST /api/v1/businesses/{businessId}/orders/quote
Body is the CreateOrderRequest shape. Returns computed subtotal, appliedDiscounts[], per-line discountAmount and lineTotal, total, and any warnings (low stock, coupon rejected with reason).

The cart panel recalculates on every quantity change. Without this endpoint you get one of two bad outcomes: the client reimplements the discount engine and drifts from the server, or you create and abandon throwaway orders. Creates nothing and persists nothing.

5. Server-side discounts and coupons — Blocking
CreateOrderRequest currently accepts a flat client-supplied discountAmount. A cashier can post any value they like, so discount rules are unenforced. DiscountResponse already models percentage / fixed / BXGY with ruleType, scope, minOrderAmount, maxDiscountAmount, and selectedDay — none of which can be enforced client-side.

Replace it:

couponCode: string? — server resolves, validates window, usage limits, per-customer limits, minimum purchase.
discountIds: string[]? — explicitly applied manual discounts, server validates scope and eligibility.
manualDiscountAmount: number? — cashier discretion, gated behind an order:discount-override permission and written to audit.
Response gains appliedDiscounts[]: {discountId, name, type, value, amount, couponCode?}, and OrderItemResponse.discountAmount gets populated per line.

Coupon usedCount must increment on payment, not on order creation, and must be atomic — otherwise a limited coupon oversells under concurrent tills.

6. Register and session completeness — Blocking
You can open a session for a registerId, but nothing creates a register, nothing lists them, and nothing reports which session is currently open. A page refresh loses the shift.


GET    /api/v1/businesses/{businessId}/registers
POST   /api/v1/businesses/{businessId}/registers
GET    /api/v1/businesses/{businessId}/registers/{registerId}
PUT    /api/v1/businesses/{businessId}/registers/{registerId}
PATCH  /api/v1/businesses/{businessId}/registers/{registerId}/activate
PATCH  /api/v1/businesses/{businessId}/registers/{registerId}/deactivate

CashRegisterResponse:
  id, businessId, name, code, location,
  status (ACTIVE|INACTIVE), currentSessionId?, createdAt

GET /api/v1/businesses/{businessId}/sessions/current   → RegisterSessionResponse | 204
GET /api/v1/businesses/{businessId}/sessions           → paged shift history
GET /api/v1/registers/{registerId}/sessions/current
/sessions/current resolves from the authenticated cashier and is what makes a refresh survive. Until it exists the frontend has to stash sessionId in a cookie and validate it against /sessions/{id}/summary, which is a workaround, not a design.

Invariants to enforce: at most one open session per cashier and one per register; 409 SESSION_ALREADY_OPEN on a double open. POST /sessions/{id}/close must reject while orders on that session are still PENDING, or explicitly define what happens to them.

7. Item lookup for the product grid — Blocking
GET /api/v1/sales-channels/{channelCode}/items takes only channelCode — unpaged, no keyword, no category filter. That's unusable as a till grid past a few dozen items.

Cheapest fix: add channelCode to ItemSearchFilter and use the existing POST /businesses/{businessId}/items/filter, which already pages and sorts. Preferable to adding a parallel paging implementation on the channel endpoint.

Two related points:

GET /businesses/{businessId}/stock/current returns the entire catalog's stock. Add filtering by item ids, or paging, so the grid can fetch stock for the visible page only.
ItemVariantResponse has no barcode. If a cashier scans a specific size or colour, variants need their own barcodes and GET /items/barcode/{barcode} must resolve to (item, variant). Decide this before the scan-to-cart path is written.
8. Sales and receipts list — Hardening

GET /api/v1/businesses/{businessId}/sales        → PagedModelSaleResponse
GET /api/v1/businesses/{businessId}/sales/{saleId}
Query: page, size, sort, from, to, cashierId, sessionId, paymentMethod, channel, keyword

SaleResponse already exists as a schema but nothing returns a collection of them. This backs the POS Receipts tab and any revenue figure. The POS receipts tab can technically be driven by the order list filtered to PAID, which is why this is Hardening rather than Blocking — but reporting wants the sale projection.

9. Refund and void — Hardening

POST  /api/v1/businesses/{businessId}/sales/{saleId}/refund
PATCH /api/v1/businesses/{businessId}/sales/{saleId}/void
Refund body: items[] for partial or omitted for full, reason, refundMethod. Restocks, writes a negative cash movement when the refund is cash, links to the original sale, requires an order:refund permission, and is audited. Void is the same-day mistake path and may be a simpler operation.

There is currently no way to reverse a sale at all. Combined with the missing idempotency key, a double-charge today is unrecoverable through the API.

10. Staff PIN — Hardening

PUT    /api/v1/businesses/{businessId}/staff/{userId}/pin      body {pin}
DELETE /api/v1/businesses/{businessId}/staff/{userId}/pin
POST   /api/v1/businesses/{businessId}/staff/pin/verify        body {pin}
Store BCrypt hash, never the PIN. Add hasPin: boolean to StaffResponse so the UI knows whether to offer the lock screen.

The critical constraint: verify is a screen unlock, not a login. It operates on an already-authenticated Keycloak session and must never mint one. Rate limit to 5 attempts, then 423 PIN_LOCKED for 15 minutes. Until this exists the PIN pad is decorative — any valid session satisfies it.

11. Business-scoped feature flags — Hardening
GET/PATCH /api/v1/admin/businesses/{businessId}/features is platform-admin scoped, so a store owner cannot read their own flags.


GET /api/v1/businesses/{businessId}/features    → BusinessFeatureResponse[]
Add POS to the BusinessFeature enum (currently STOREFRONT | TELEGRAM_BOT | KHQR_PAYMENT) if POS is meant to be toggleable per store. Keep the mutating PATCH admin-only — a business shouldn't grant itself features — unless you specifically want self-service enablement, in which case add a business-scoped PATCH restricted to a self-serviceable subset.

12. Customers — Deferred

GET/POST       /api/v1/businesses/{businessId}/customers
GET/PUT/DELETE /api/v1/businesses/{businessId}/customers/{customerId}
GET            /api/v1/businesses/{businessId}/customers/search?keyword=
Fields: id, name, phoneNumber, email, membershipTypeId, note, status, createdAt

CreateOrderRequest.customerId already exists but is unusable because nothing creates a customer. This also blocks SPECIFIC_MEMBERSHIP-scoped discounts — membership-types CRUD exists with no member records behind it — and digital receipt delivery. Search by phone is the till lookup path.

13. Analytics — Deferred

GET /api/v1/businesses/{businessId}/analytics/summary?from=&to=
GET /api/v1/businesses/{businessId}/analytics/sales-series?from=&to=&interval=DAY|HOUR
GET /api/v1/businesses/{businessId}/analytics/top-items?from=&to=&limit=
Summary: grossSales, netSales, discountTotal, refundTotal, orderCount, averageOrderValue, itemsSold, byPaymentMethod[], byChannel[], byHour[].

/admin/dashboard is platform-scoped and not a substitute. Day bucketing depends on the business timezone from item 0.

14. Permissions catalog
The frontend already maps Keycloak client roles to UI permissions, reading order:read|create|pay|cancel|generate-khqr. New permissions must be published in the same resource:action form or the mapping silently grants nothing:

order:refund, order:discount-override, order:update, sale:read, register:manage, register:open, register:close, cash-movement:create, customer:read, customer:create, customer:update, analytics:read

15. Multi-currency tender — Deferred, but decide scope
PayOrderRequest has a single receivedAmount. Split tender — part USD, part KHR, or cash plus card — is normal in Cambodian retail and cannot be expressed. If in scope, replace with payments[]: {method, currency, amount, exchangeRate}, and return change in the currency the business settles in. If out of scope, say so explicitly so the UI doesn't imply it.

Suggested build order
Item 0 decisions, plus error codes (unblocks everything, mostly paperwork)
Idempotency keys
Order list + order update/rename
Quote endpoint + server-side discounts
Registers CRUD + /sessions/current + session linkage
Channel filter on item search, stock filtering
Sales list
Refund/void, PIN, feature flags
Customers, analytics, split tender
Items 1–6 are what I'd want in place before building the POS UI in earnest. Everything after that the UI can stub cleanly.

Two notes on where things stand. The /pos route move is partially applied — the route group, guard layout, and pos-routes.ts exist, and cash-register.tsx and part of pin-pad.tsx are rewired; the close-register redirect, the navbar's two /sales/close-cash-register pushes, navigation.ts, and the proxy matcher are not yet updated, so the app is mid-refactor and some POS links still point at the old paths. Say the word and I'll finish it — it's about ten minutes and independent of all backend work.

Also worth flagging: this spec is long enough that you probably want it as a file to hand to whoever writes the Spring code. I didn't create one since you didn't ask, but I can write it to api-docs/pos-backend-spec.md on request.
