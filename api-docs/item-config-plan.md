# Inventory Restructure — Plan v6 (plain English)

Status: Item Config and the item form are **built as static UI**. API next, once
this is approved.

v5 unmerged options and variants: variations stay as attributes, variants are
add-ons only. v6 adopts CartonCloud's product UOM model — **conversions belong
to the item, not to the unit** — which also deletes "packaging" as a separate
idea. See §5.1–5.4.

---

## 1. First — the barcode question

> "the same product with different variation have the same barcode right?"

**For made-to-order food and drink, yes.** An Ice Latte has no barcode on it at
all, and size is a choice made at order time. There is one item, one code, and
Small/Medium/Large are decisions, not separate products.

**For packaged retail goods, no.** A 330 ml can and a 1.5 L bottle scan
differently — that's the entire job of a barcode: to identify one specific
sellable package.

That doesn't break your instinct, it just gives us the dividing rule:

> **If two things scan differently, they are two items.
> If they differ only by a choice made at order time, that's an option.**

A café selling bottled water in two sizes models them as **two items**, each with
its own barcode and its own stock. A café selling lattes models size as an
**option** on one item. Both work, neither needs variations to carry barcodes,
and merchants don't have to be taught a new concept — they already know whether
the thing has a barcode printed on it.

So: **variations never get a barcode, never get their own stock line.** Confirmed.

---

## 2. The model

Three things, with clearly different jobs:

| | **Item** | **Option** | **Add-on** |
| --- | --- | --- | --- |
| What it is | The product | A choice about it | An extra piled on |
| Example | Ice Latte | Size: S / M / L | Pearls · Extra shot |
| Unit | ✅ | ❌ | ✅ |
| Stock | ✅ | ❌ | ✅ |
| SKU / barcode | ✅ | ❌ | ❌ |
| Base unit + conversions | ✅ | ❌ | ✅ |
| Price | Sale Management | Sale Management | Sale Management |
| Reusable | — | via presets | ✅ shared library |

**Inventory holds no prices at all.** Not one field, anywhere. Inventory answers
*what do we have and how is it measured*; Sale Management answers *what does it
cost*.

**Options are attributes**, exactly as they are today — `OPTION` placement stays,
nothing merges, no migration of attributes at all. An option is a choice with no
physical existence of its own: choosing "Large" doesn't deplete a "Large".

**Add-ons are the only new stockable thing.** One Pearls record, one 2 400 g
balance, eighteen drinks drawing from it. Edit it anywhere and all eighteen see
it, because there was only ever one. That's what "everything must sync" means.

An item's own stock stays separate: a Milk Tea deducts Milk Tea stock; the pearls
on top deduct Pearls stock. Two ledgers, one sale.

### What this drops from v4

Gone: variation sets, the variation/add-on distinction, sellable-alone rules,
barcodes and SKUs on variants, and the whole OPTION→variant migration. The model
lost about half its moving parts and didn't lose a capability.

### The one trade-off

Under v4, "Large cup" could hold stock, so choosing Large depleted your cup
supply. Options can't do that. If you genuinely want cups counted, they become
either a **supply item** you count on its own, or an **add-on** attached to the
item. My read: cups are a supply item, and tying them to a size choice was
over-engineering. Flag it if you disagree — it's the only thing v5 can't do that
v4 could.

---

## 3. Add-ons

An add-on is a thing you stock and sell **only** attached to an item. Pearls
never appear in POS search and can't be rung up alone.

Defined once in the library, attached to any number of items:

```
Pearls        gram    2 400 g in stock    used by 18 items
Jelly         gram    1 850 g             used by 12 items
Extra shot    shot      840               used by  6 items
Whipped cream gram      600 g             used by  4 items
```

### Add-on sets

A set groups add-ons that get offered together, and carries a selection rule:

```
Toppings    any number · optional     Pearls · Jelly · Pudding · Aloe
Extras      up to 2 · optional        Extra shot · Whipped cream · Syrup
```

An add-on doesn't have to be in a set — a standalone "Extra shot" attaches
straight to an item. Sets are a convenience for attaching several at once and for
telling the till how to present them.

### How much a sale draws

An add-on is counted in its own unit, and that unit is often not "one per sale":

| Add-on | Base unit | One order uses |
| --- | --- | --- |
| Pearls | gram | 30 g |
| Extra shot | shot | 1 |
| Syrup | millilitre | 15 ml |

So each add-on carries a **"one order uses"** amount, defaulting to 1 of its own
unit. Leave it at 1 and it behaves the obvious way; set it to 30 and you get
ingredient-level tracking without the merchant thinking in "servings".

---

## 4. Options stay as they are

No change to attributes except that they're now clearly the home for variations:

| Placement | Role |
| --- | --- |
| `OPTION` | The customer picks one — Size, Milk, Sugar level |
| `HIGHLIGHT` | Perk tile below Add to Cart ("Free delivery") |
| `SPECIFICATION` | Tile in the spec grid |
| `HIDDEN` | Internal / reporting only |

All five types stay (`TEXT`, `SELECTION`, `TOGGLE`, `NUMBER`, `COLOR`), icons
stay, the spec-grid coupling stays, the per-placement rules stay.

One small addition worth having: an `OPTION` attribute should be markable
**required**, so a sale can't proceed without a size. Today nothing enforces
that.

Today's inline `variants` rows (name + price + available) become `OPTION`
attributes, and their prices move to Sale Management. That's the only migration.

---

## 5. Item Config

```
/inventory/config
    · Units
    · Item groups        ← today's /inventory/categories moves here
    · Add-ons            ← the shared library, with sets
    · Option presets     ← reusable choice lists
```

### 5.1 Units — the vocabulary only

Following CartonCloud's product UOM model, the global library holds only what is
**universally true of a unit**: its name, its symbol, and what it measures.

- **Predefined units** — ship with the platform, selectable, **locked**: never
  edited, never deleted.
- **Business units** — created by the owner, fully editable.
- **A unit in use cannot be deleted** — items measured in it would be orphaned.

| Category | Measures | Predefined |
| --- | --- | --- |
| **Mass** | weight | gram, kilogram |
| **Volume** | liquid / space | millilitre, litre |
| **Count** | discrete things | piece, dozen, carton |

There is deliberately **no conversion factor here**. That was the mistake in the
earlier draft.

### 5.2 Conversions belong to the item

Each item picks a **base unit of measure** — the smallest quantity it is
sellable and pickable in — and then declares conversions against it:

```
Ice Latte      base: cup      (no conversions — you sell it one cup at a time)
House Coffee   base: gram     1 bag  = 3 000 g
Rice           base: gram     1 sack = 25 000 g
Cola           base: ml       1 bottle = 750 ml · 1 carton = 18 000 ml
```

This is the whole point: **a sack of rice and a sack of flour are both sacks and
do not weigh the same.** Making the factor global would force one of them to be
a lie. Per-item, both are simply true.

Two details taken straight from CartonCloud, because they are the ones people
get wrong:

- **The factor direction is stated, not implied.** The field reads "one *sack*
  holds ___ *grams*" — 25 000, not 1/25 000.
- **A Swap button** fixes it when they get it backwards anyway, and entering a
  factor below 1 is rejected with a nudge toward Swap.
- **Changing the base unit clears the conversions**, because they no longer mean
  anything.

### 5.3 Packaging is not a separate concept

The earlier draft had a "packaging" field — *sold as bottle, contains 750 ml*.
Per-item conversions already say exactly that, so packaging is deleted as an
idea. An item based in millilitres with a `1 bottle = 750 ml` conversion **is**
an item sold by the bottle and counted by the litre.

One less concept, same capability.

### 5.3b Worked example: beer by the can, six-pack, half case and case

This is the case that proves the model, so it is worth spelling out.

You sell beer four ways: **single can, six-pack, half case (12), full case (24)**.

**Set-up, once:**

```
Item config → Units          add Six-pack, Half case, Case   (all Count)

Item "Beer"
  Base unit of measure   Can          ← the smallest thing you sell
  Conversions            1 Six-pack  = 6  Can
                         1 Half case = 12 Can
                         1 Case      = 24 Can
```

That is the whole set-up. No variants, no options, no duplicate items.

**Why it works:**

- **One stock balance, held in cans.** Receive 10 cases → +240 cans. Sell a
  six-pack → −6. Sell a single → −1. Nothing can drift out of sync, because
  there is only ever one number.
- **Every conversion is against the base**, never chained. A case is 24 cans,
  not "2 half cases". Chaining is where these systems start disagreeing with
  themselves.
- **Half of a half case is just another conversion.** Six-pack = 6 cans. It does
  not need to know that it is half of twelve.
- **Stock shows in cans and reads correctly in any of them.** 240 cans is 10
  cases, or 20 half cases, or 40 six-packs — all derivable, none stored.

**Pricing, in Sale Management:**

```
POS channel                    Storefront channel
  Beer · Can         $1.50       Beer · Can        —  (not sold online)
  Beer · Six-pack    $8.00       Beer · Six-pack   $9.00
  Beer · Half case  $15.00       Beer · Half case  —
  Beer · Case       $28.00       Beer · Case      $30.00
```

Two things fall out of this that we get for free:

1. **Bulk discounts are just prices.** A case at $28 rather than 24 × $1.50 =
   $36 needs no discount rule — it is simply what a case costs.
2. **Pricing a UOM is what makes it sellable.** No "is sellable" flag is needed
   anywhere in inventory. Leave the Can unpriced on the storefront and the
   storefront does not offer single cans. Inventory says which units *exist*;
   Sale Management says which ones you *sell, where, and for how much*.

That second point matters for add-ons too: `1 bag = 3000 g` of pearls is a
purchasing unit, and it stays a purchasing unit purely because nobody ever
prices it.

### 5.4 Item groups

Today's Categories screen, moved here unchanged. Two levels.

Known wart carried over: filtering by a parent category doesn't include items in
its subcategories. Worth fixing, separate decision.

### 5.5 Add-ons

The library, in two views:

```
ADD-ONS
Name            Unit    Stock     One order   Used by
Pearls          gram    2 400 g      30 g     18 items
Jelly           gram    1 850 g      30 g     12 items
Extra shot      shot      840         1        6 items

SETS
Toppings    any number · optional    Pearls · Jelly · Pudding · Aloe
Extras      up to 2 · optional       Extra shot · Whipped cream
```

Deleting an add-on that's in use warns you which items lose it.

### 5.6 Option presets

Your original ask was for reusable "sets that can be used in future items". Add-ons
cover that for toppings. For **variations**, options are still retyped per item —
you'd write Small/Medium/Large on every drink.

An **option preset** is that list saved once:

```
Size         Small · Medium · Large
Milk         Dairy · Oat · Almond
Sugar level  0% · 50% · 100%
```

On an item you press "Use a preset" and the option attribute fills in, then you
adjust for that item. It's a **starting point, not a live link** — editing the
preset later doesn't rewrite items already using it, because per-item tweaks are
certain and a live link would silently mutate hundreds of items nobody reviewed.

Presets hold names only. No stock, no price, nothing to sync.

**Say if you don't want this tab** — it's my addition, not yours, and the model
works without it. It just saves retyping.

---

## 6. The item form

Same as today minus price, plus an add-ons section. Four cards:

```
┌─ Basics ─────────────────────────────────────┐
│ Name · SKU · Code · Barcode                  │
│ Group · Type · Status                        │
│ Badge · Description                          │
└──────────────────────────────────────────────┘
┌─ Stock & measurement ────────────────────────┐
│ Unit · Packaging · Opening stock · Low-stock │
└──────────────────────────────────────────────┘
┌─ Options & add-ons ──────────────────────────┐
│ Options     [ Add option ]  [ Use a preset ] │
│   Size          S · M · L        required    │
│   Milk          Dairy · Oat      required    │
│                                              │
│ Add-ons     [ Attach a set ]  [ Attach one ] │
│   Toppings      any number · optional        │
│     Pearls · Jelly · Pudding                 │
│                                              │
│ Attributes  [ Add attribute ]                │
│   Free delivery        highlight             │
└──────────────────────────────────────────────┘
┌─ Store page ─────────────────────────────────┐
│ description block editor                     │
└──────────────────────────────────────────────┘
```

Options and non-option attributes are the same underlying thing, just shown in
two groups so the form reads the way a merchant thinks: *choices* above,
*facts* below.

Attached add-ons show unit and stock read-only, with an edit pencil that opens
the popup and warns changes apply **everywhere it's used**.

### The add-on popup

Opens from the item form or the Add-ons tab. Same form, same record.

```
┌─ Pearls ─────────────────────────────────── ✕ ─┐
│  ⚠ Used by 18 items — changes apply to all      │
│                                                 │
│  Name       [ Pearls              ]             │
│                                                 │
│  ── Measurement ──────────────────────────────  │
│  Unit       [ gram ▾ ]  (mass)                  │
│  Packaging  [ 1 ] bag contains [ 3000 ] g       │
│                                                 │
│  ── Stock ────────────────────────────────────  │
│  On hand    2 400 g            [ Adjust ]       │
│  One order  [ 30 ] g                            │
│  Low-stock  [ 500 ] g                           │
│                                                 │
│  ── Pricing ──────────────────────────────────  │
│  Priced per channel in Sale Management  →       │
│                                                 │
│           [ Cancel ]  [ Save add-on ]           │
└─────────────────────────────────────────────────┘
```

No SKU, no barcode — an add-on is never scanned.

**Stock is only ever changed by recording a movement**, never by typing over the
number. On a new add-on the field is "opening stock"; after that it's read-only
with an Adjust link. Otherwise the ledger grows silent gaps nobody can explain.

The Pricing row is a signpost, not a field.

---

## 7. Stock screen

```
ITEMS                     Unit    On hand   Low    State
  Ice Latte               cup         120     20   in stock
  House Coffee            gram     18 500  2 000   in stock
  Croissant               piece         6     10   low

ADD-ONS                   Unit    On hand   Low    State     Used by
  Pearls                  gram      2 400    500   in stock    18
  Jelly                   gram        180    500   low         12
  Extra shot              shot        840    100   in stock     6
```

**Stock value is cost-based**, from the ledger's `unitCost`, and labelled as
such — selling price no longer lives here.

**Low-stock gets one rule.** Three conflicting definitions exist today, and the
POS one fires an alert on every sold line regardless of quantity. One rule
everywhere: `out` when `qty ≤ 0`, `low` when `0 < qty ≤ threshold`.

---

## 8. Items list

Loses the price column, price filters and price sort. Gains **unit** and **on
hand**, which is what an inventory list is actually for.

---

## 9. Data migration

1. Item prices → Sale Management, per channel.
2. Today's inline `variants` rows → `OPTION` attributes; their prices → Sale
   Management.
3. Attributes are otherwise untouched. No OPTION migration.

Add-ons start empty — they're new, nothing to migrate.

Migration precedes field removal, not the reverse.

---

## 10. Settled

- Price per sales channel, in Sale Management — nothing priced in inventory. ✅
- Options and variants stay **separate**. ✅
- Variations are options: no barcode, no stock. ✅
- Variants are add-ons only: stock + unit, no barcode, no SKU. ✅
- Packaging in scope, on items and add-ons. ✅
- Per-item price override — later. ✅
- Add-on groups — skipped. ✅

Open, not blocking: whether you want the **Option presets** tab (§5.6), and
whether losing stock-tracked size options (§2) matters to you.

---

## 11. Build order

Static UI only. Hardcoded sample data, no API calls, no schema changes. Once you
approve how it looks and behaves, we design the API to match.

1. **Item Config shell** — `/inventory/config`, tabs
2. **Units tab** — system/custom split, create/edit, family picker
3. **Conversions tab** — read-only relationships + try-it converter
4. **Item groups tab** — move Categories across as-is
5. **Add-on popup** — the §6 form, standalone and mockable
6. **Add-ons tab** — library list + sets with selection rules
7. *(if wanted)* **Option presets tab**
8. **Item form rework** — strip price, add Stock & measurement card, split
   Options / Add-ons / Attributes, hang the popup off each add-on row
9. **Stock screen** — items + add-ons sections, cost-based value tile
10. **Items list cleanup** — drop price column/filters/sort, show unit + on hand

1–4 are independent. 5 feeds 6 and 8. 9 and 10 are cleanup.
