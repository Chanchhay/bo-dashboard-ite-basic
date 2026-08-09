# Item & Stock — Business Logic

The rules that govern items and stock in this system, scraped from the frontend
and cross-checked against `api-docs/api.json` (Fluxipos v1). This is a statement
of *what the domain does*, not how it is wired.

Terminology: the domain word is **item**. Some code still says `product`
(`InventoryProductList`, `productSearch`); the domain is items.

---

## 1. What an item is

An item is the sellable unit of a business. It carries four separable concerns:

| Concern | Fields | Meaning |
| --- | --- | --- |
| **Identity** | `name`, `sku`, `code`, `barcode`, `slug` | How the item is named and looked up |
| **Commerce** | `price`, `compareAtPrice`, `itemType`, `status` | Whether and at what price it sells |
| **Merchandising** | `images`, `badge`, `description`, `descriptionBlocks`, `attributes`, `variants` | How it presents on the storefront |
| **Inventory** | `unit`, `lowStockDefault` | How it is counted and when it's flagged |

Only `name`, `itemType` and `price` are genuinely required. Everything else is
optional, which means **an item can exist with no category, no unit, no barcode
and no images**.

### Item type

`PHYSICAL` | `DIGITAL` | `SERVICE`. Required, defaults to `PHYSICAL` on the form.

Critically: **type does not gate anything.** A `SERVICE` item still carries
`lowStockDefault`, still accepts stock entries, and still appears in the stock
table with a quantity and a computed inventory value. The domain does not
currently model "this thing isn't counted".

### Status

`ACTIVE` | `INACTIVE`, defaulting to `ACTIVE`. This is the sell/don't-sell
switch. It is orthogonal to stock — an `ACTIVE` item with zero quantity is still
active, and an `INACTIVE` item still holds stock. Deactivating is the soft
alternative to deleting; delete is hard and unconfirmed by the API (the UI adds
its own "cannot be undone" confirmation).

### Price

`price` is the selling price. `compareAtPrice` is the *was* price — the
strike-through anchor shown next to a discount. Both are `≥ 0`; `price` is
required and defaults to 0, so **a free item is representable and indistinguishable
from an unpriced one**.

Neither carries a currency. Prices are held in the business's base currency and
rendered through the business's current currency setting at display time. Moving
the base currency therefore **restates the whole catalogue** rather than
converting it — every price, every inventory value, every price filter.

---

## 2. Identity and lookup rules

Three separate identifiers, with three different meanings and three different
enforcement stories:

| Code | Purpose | Length | Uniqueness |
| --- | --- | --- | --- |
| `sku` | Merchant's stock-keeping code | ≤ 100 | **Not enforced anywhere** |
| `code` | Internal reference | ≤ 100 | Not enforced |
| `barcode` | Physical scan code | ≤ 100 | Enforced on create only |

**Barcode uniqueness is the only one the system defends**, and only partially:
creating an item with a barcode already in use returns a business error ("That
barcode is already assigned to another item. Generate a new one."). **Editing an
item to take another item's barcode is not checked** — the collision goes
through, and after that a scan resolves to whichever item the backend returns
first. This is the sharpest correctness gap in the item model, because barcode is
the one code the domain treats as a lookup key: `GET items/barcode/{barcode}`
returns a *single* item, so duplicates make scanning non-deterministic.

Barcode can be typed or **generated**. Generation produces a valid EAN-13 (12
digits, non-zero leading, mod-10 check digit) and retries until it finds one no
existing item holds; if it can't find a free code it fails rather than issuing a
duplicate. Generation is offered **on create only** — an existing item without a
barcode cannot be assigned one from the edit screen, which is a real operational
gap for catalogues that predate barcoding.

The generated code is EAN-13, but the on-screen preview and the downloadable PNG
both render **CODE128**. Same digits, different symbology. Worth deciding which
one the business actually prints, because a shelf label and a scanner
configuration have to agree.

Scanning is a plain focused text field — hardware wedge scanners type into it.
It has two modes: *resolve and select* (the stock adjustment form uses it to pick
an item) and *resolve and show* (the item list shows a result card). A scan that
matches nothing is an error, not an offer to create.

---

## 3. Categorisation

### Groups are exactly two levels

A business organises items into **categories**, each holding **subcategories**.
There is no third level — a subcategory has no children, structurally, not by
validation. An item is assigned to *one* group, and that assignment may point at
either a category or a subcategory (they're both valid `itemGroupId` targets).

Consequences the domain has to live with:

- An item filed under a subcategory is **not** returned by a filter on its
  parent category. Filtering is exact-id equality, not subtree matching. "Show me
  everything in Beverages" does not include items filed under Beverages/Matcha.
- Deleting a category with assigned items is permitted; the system gives no
  cascade guarantee, and the UI only warns that "items assigned to it may need to
  be updated." What actually happens to those items on delete is unspecified.

Categories carry an optional `note` (≤ 255) that is descriptive only — nothing
reads it as a rule.

### Units are global, not per-business

A unit (piece, kg, litre…) is **platform-owned**. A business can *select* a unit
for an item but cannot create, rename or delete one — that's an admin-only
capability with no interface in this app. If the unit a merchant needs doesn't
exist in the platform list, they cannot proceed except by leaving the item
unitless.

Unit is purely a **display label** on quantities. Nothing converts between units,
nothing validates that a fractional quantity makes sense for the unit, and
nothing stops an item measured in "piece" from receiving a stock change of 0.5.

---

## 4. Merchandising rules

### Attributes — typed, and *placed*

An attribute is a named, typed fact about an item. What makes the model
non-trivial is that **type and placement are independent**: the type says what
kind of value it holds, the placement says what job it does on the storefront.

Types: `TEXT`, `SELECTION`, `TOGGLE`, `NUMBER`, `COLOR`.

Placements:

| Placement | Storefront role |
| --- | --- |
| `OPTION` | Shopper-selectable chips or colour swatches, above Add to Cart |
| `HIGHLIGHT` | A perk tile below Add to Cart ("Free Delivery") |
| `SPECIFICATION` | A tile in the spec grid inside the description |
| `HIDDEN` | Internal only — kept for reporting, never shown |

The cross-rules follow from those roles:

- A `TOGGLE` carries **no values** — it *is* the value ("has this / doesn't").
- A `HIGHLIGHT` or `SPECIFICATION` carries **at most one** value — it's a
  statement, not a choice.
- An `OPTION` that is `SELECTION` or `COLOR` needs **at least one** value —
  otherwise there is nothing to select.
- Every `COLOR` value needs a hex code, because it renders as a swatch.
- Every `NUMBER` value must parse as a number.
- Attribute names are unique per item, case-insensitively.

Each value can be marked **unavailable** — the "sold out" state for a specific
option (size L gone, red gone) without deleting the option. This is per-value
availability, and it is *not* connected to stock: nothing sets it automatically
when quantity hits zero. Availability and stock are two separate, unsynchronised
notions of "can't buy this".

`icon` is an opaque key resolved entirely by the frontend, and an unknown key
degrades to a neutral dot. The backend deliberately does not validate it against
an enum, so adding a glyph is a presentation change with no contract impact.

### Variants are not real variants

A "variant" here is `{ name, price, available }` — an alternate name and price
under the same item. It has **no SKU, no barcode, and no stock of its own**.
Stock is tracked at the item level only.

So the model supports "Small $3 / Large $4" as pricing rows, but it cannot answer
"how many Larges do I have". If size-level stock is a requirement, this is the
structural gap — variants would need to become stock-bearing, or sizes would need
to be separate items.

Variant availability, like attribute-value availability, is manual.

### Description blocks

The storefront page below the fold is composed from ordered blocks:
`PARAGRAPH`, `HEADING`, `BULLETS`, `IMAGE`, `SPEC_GRID`, `COLUMNS`.

Nesting is **one level**: a `COLUMNS` row holds 2–3 columns of leaf blocks, and a
column can never hold another `COLUMNS`. Limits: ≤ 30 blocks per item, ≤ 20
bullets per list, ≤ 20 blocks per column.

`SPEC_GRID` is the interesting one — it holds no content itself. It's a *slot*
that renders whichever attributes were placed as `SPECIFICATION`. So an
attribute's placement and the presence of a spec-grid block are coupled: placing
attributes as `SPECIFICATION` does nothing visible unless a `SPEC_GRID` block
exists somewhere in the layout, and vice versa.

Block images are stored the moment they're picked, so an abandoned edit leaves
an orphaned upload unless the editor's own cleanup runs.

### Images and the thumbnail rule

An item holds up to **10 images, 10 MB each**. Order is meaningful and
server-owned: **the first image is the thumbnail** and the rest form the gallery.
That single rule is why reordering exists as an operation at all — "make this the
thumbnail" is expressed as "move it to position 0".

Reordering is atomic over the whole gallery (the full order is submitted, not a
swap), and deleting an image applies immediately rather than at save. So image
edits on an existing item are **not undoable by cancelling the form** — they've
already happened. Newly added images are the exception; they only land on save.

`badge` (≤ 40 chars) is free text stamped on the storefront card — "NEW ARRIVAL",
"SALE". Nothing validates it against a vocabulary and nothing sets it
automatically, e.g. no rule says a `compareAtPrice` implies a sale badge.

---

## 5. The stock model

### Stock is a ledger, not a number

Quantity is never written directly. Every change is an **append-only entry**:

```
entry { itemId, entryType, quantityChange, quantityBefore, quantityAfter,
        unitCost, batchData, referenceType, referenceId, referenceNumber,
        reason, createdBy, createdDate }
```

`quantityBefore`/`quantityAfter` are computed by the backend, so the ledger is
self-auditing: each entry records the balance it moved from and to. The current
quantity is the projection (`quantityOnHand` per item, with `lastEntryId` and
`updatedAt`).

This gives the business a full stock history for free — every movement has an
actor (`createdBy`), a time, a reason, and optionally a document reference.

### Entry types and who writes them

| Type | Means | Origin |
| --- | --- | --- |
| `OPENING_STOCK` | Initial balance when an item starts being tracked | Manual |
| `STOCK_IN` | Receipt — purchase, delivery, transfer in | Manual |
| `STOCK_OUT` | Issue — wastage, transfer out, internal use | Manual |
| `ADJUSTMENT` | Correction after a count | Manual (default) |
| `SALE` | Deduction from a completed sale | **Backend, from the order flow** |
| `RETURN` | Restock from a customer return | Backend |

The intent is clear: four manual types, two system types. **But the adjustment
form offers all six**, so an operator can hand-write a `SALE` entry. Since the
POS already generates one per sold line, a manual `SALE` double-counts against
real revenue movement and corrupts the ledger's meaning — `SALE` entries should
reconcile against orders, and a hand-written one never will. The form should
almost certainly restrict itself to the four manual types.

### Quantity semantics

`quantityChange` is **signed**: positive adds, negative removes. It also accepts
fractions (two decimal places), which is right for weight- or volume-measured
items and meaningless for piece-counted ones — nothing ties the allowed precision
to the item's unit.

There is **no floor**. Nothing prevents an entry that drives stock negative, and
nothing warns before one. Whether negative stock is legitimate (backorder,
in-flight receipt) or an error is a policy question the system currently doesn't
take a position on.

### Batch tracking

Any entry may carry `batchData`, constrained in practice to three optional
fields: **lot number, manufactured date, expiry date**. This is the hook for
perishable and regulated goods.

But it is captured only — **nothing reads it back**. There is no FEFO/FIFO
consumption, no expiry report, no "which lot did this sale draw from". A `SALE`
entry doesn't reference the batch it depleted. Batch data today is a note
attached to a receipt, not a tracked sub-balance. If expiry management is a real
requirement, this is where it starts and currently stops.

### Cost vs price

Entries carry `unitCost` — what the stock cost to acquire. The item carries
`price` — what it sells for.

**Inventory value is computed from `price`, not `unitCost`.** So the "Inventory
value" figure is retail value at list price, not cost of goods on hand. Both are
legitimate numbers to want; the system captures the inputs for both and only ever
reports the first, unlabelled. Any margin or COGS question needs the ledger's
`unitCost`, which nothing currently aggregates.

### Document references

Every entry may cite a source document: `referenceType` (free text, e.g.
`PURCHASE_ORDER`), `referenceNumber` (`PO-2026-001`), and `referenceId` (a UUID
linking to another record). `referenceType` is unconstrained free text, so
consistency across operators is convention, not enforcement — `PURCHASE_ORDER`,
`purchase order` and `PO` are three different values to any future report.

---

## 6. Stock health rules

Three states, derived per item from quantity and `lowStockDefault`:

| State | Rule |
| --- | --- |
| Out of stock | `quantity ≤ 0` |
| Low stock | `0 < quantity ≤ lowStockDefault` |
| In stock | `quantity > lowStockDefault` |

Two problems with this as stated.

**`lowStockDefault` defaults to 0.** With a threshold of 0, the low-stock band
`0 < q ≤ 0` is empty — the item can *never* be flagged low, only out. Every item
created without deliberately setting a threshold has low-stock detection silently
disabled. Given the field is optional and defaults to zero on the form, that is
probably most of the catalogue. The threshold arguably wants a sensible default,
or "0" wants to mean "use a business-wide default" rather than "never warn".

**The rule is defined three different ways across the app:**

| Where | Rule | Effect |
| --- | --- | --- |
| Stock screen | `q > 0 && q ≤ threshold` | Out-of-stock items excluded from the low count |
| Dashboard | `threshold > 0 && q ≤ threshold` | Out-of-stock items **counted as low** |
| POS, after a sale | threshold read, never compared | **Every sold line emits a low-stock warning** |

So the dashboard and the stock screen report different low-stock counts for the
same data, and the POS one is simply broken — it fires an "Item X is low, go
restock" notification on every line of every sale regardless of quantity, which
trains staff to ignore the alert entirely. That third one is the bug to fix
first; the first two need one agreed definition (my read: out-of-stock should be
its own state, not folded into low, so the stock screen's version is right).

Low-stock alerting is otherwise **manual and pull-based**: someone opens the
stock screen and presses "Alert Low Stock", which sends one notification naming
up to three affected items. There is no scheduled or threshold-triggered alert,
and the notification currently goes only to the person who pressed the button.

---

## 7. Catalogue search semantics

What the merchant gets when they search and filter — the behaviour, not the
mechanism:

- **Keyword** is a case-insensitive substring across `name`, `code`, `sku` and
  `barcode` together. Typing a partial SKU finds the item.
- **SKU and barcode filters** are **exact matches**, not substrings — unlike the
  keyword box. Same field, two different matching rules depending on which input
  the merchant used. Worth making consistent or clearly labelling.
- **Category** matches the exact assigned group, so filtering a parent excludes
  its subcategories' items (§3).
- **Price range** is inclusive, and **an item with no price fails both bounds** —
  unpriced items vanish from any price-filtered view rather than sorting to one
  end.
- **Sorting by price treats a missing price as 0**, so unpriced items sort as
  free — cheapest under ascending. Combined with the filter rule above, an
  unpriced item is treated as "free" when sorting and as "unknown" when
  filtering.
- Status, item type and unit are exact matches. Filters combine as AND.

Advanced filters are staged: edits are held as a draft and applied as a set, so
a half-built filter never queries. Search and status apply immediately.

---

## 8. Open questions for the redesign

Ranked by how much they'd change the model.

1. **Should variants bear stock?** Today they're pricing rows only, so
   size/colour-level quantity is unanswerable. This is the biggest structural
   decision.
2. **What is a low-stock threshold of 0 supposed to mean?** "Never warn" (current
   behaviour) or "no per-item override, use a business default" (probably the
   intent). Pick one, then fix the three conflicting rule definitions and the POS
   notification.
3. **Is negative stock legal?** No floor and no warning exists today. If it's
   legal, it needs a state and a display; if not, it needs a block.
4. **Should barcode uniqueness hold on update?** It's enforced on create and not
   on update, so the invariant that scanning resolves to one item is not actually
   guaranteed. Also: existing items can't be assigned a generated barcode at all.
5. **Do categories filter as subtrees?** Exact-match filtering means the
   hierarchy is display-only. If parent filters should include children, that's a
   query-semantics change.
6. **Is batch data meant to be tracked or just recorded?** Lot and expiry are
   captured on every entry and read by nothing. FEFO consumption and expiry
   reporting are the natural next step, and neither exists.
7. **Which value does "Inventory value" mean?** Retail (current, from `price`) or
   cost (from the ledger's `unitCost`). Probably both, labelled.
8. **Should item type gate inventory?** `SERVICE` and `DIGITAL` items currently
   carry thresholds, accept stock entries, and appear in stock counts.
9. **Should option availability follow stock?** Attribute-value "sold out" and
   quantity-zero are two unsynchronised ways to say unavailable.
10. **What happens to items when their category is deleted?** Currently
    unspecified, and the UI can only warn vaguely.

---

## 9. Rule reference

Constraints the system actually enforces, for quick lookup.

**Item** — `name` required ≤ 200 · `sku`/`code`/`barcode` ≤ 100 · `badge` ≤ 40 ·
`price` required ≥ 0 · `compareAtPrice` ≥ 0 · `lowStockDefault` integer ≥ 0 ·
`itemType` and `status` required.

**Attributes** — name required ≤ 150, unique per item (case-insensitive) ·
`icon` ≤ 40 · value ≤ 150 · `colorHex` matches `^#[0-9a-fA-F]{6}$` · plus the
type/placement rules in §4.

**Description blocks** — ≤ 30 per item · text ≤ 2000 · ≤ 20 bullets, each ≤ 300
chars · caption ≤ 150 · 2–3 columns per row · ≤ 20 blocks per column · one level
of nesting.

**Variants** — name required ≤ 150 · price ≥ 0.

**Images** — ≤ 10 per item · ≤ 10 MB each · `image/*` · position server-assigned,
first = thumbnail.

**Groups** — name required ≤ 150 · note ≤ 255 · one level of nesting.

**Stock entries** — `itemId`, `entryType`, `quantityChange` required ·
`referenceType` ≤ 40 · `referenceNumber` ≤ 80 · `reason` ≤ 255 · `unitCost` ≥ 0 ·
`quantityChange` signed, unbounded, 2 decimal places.

Two client/server mismatches to be aware of when reasoning about limits: bullet
strings are capped at 300 by the API but unbounded on the client, and block image
URLs are capped at 255 by the API against 2048 on the client — long asset URLs
will be rejected server-side.
