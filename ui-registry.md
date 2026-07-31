# UI Registry

## Baseline audit

Last audited: 2026-07-28

- Primary actions use the `primary` theme token with white text and a full
  pill radius.
- Dashboard surfaces are predominantly white with subtle green-gray borders
  and low-opacity shadows.
- Form controls use rounded corners, white backgrounds, muted placeholders,
  and a green focus border/ring.
- Existing feature-specific Figma screens use some hardcoded colors and custom
  radii. Preserve those values within their original screens; use theme tokens
  for shared interactive states in new work.

### User Profile

File: src/components/profile/UserProfileForm.tsx
Last updated: 2026-07-28

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-white` |
| Border           | `border border-[#e4eae2]` |
| Border radius    | `rounded-2xl` for surfaces; `rounded-xl` for controls |
| Text — primary   | `text-[#161d16]` and `text-[#1a222b]` |
| Text — secondary | `text-[#657064]` and `text-[#6b7569]` |
| Spacing          | `p-5 sm:p-7`, `gap-5`, and `gap-6` |
| Hover state      | `hover:bg-primary/90` for primary actions |
| Shadow           | `shadow-[0_8px_30px_rgba(26,34,43,0.06)]` |
| Accent usage     | `bg-primary/10 text-primary` |

**Pattern notes:**
Profile surfaces use restrained green-gray borders and shadows on white cards.
Use green-tinted icon containers to connect account metadata with the primary
brand color. Editable form controls use a 12px radius; actions remain full
pills to match the established dashboard controls.

### Business Currency Settings

File: src/components/business/BusinessCurrencyForm.tsx
Last updated: 2026-08-01

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-white`; `bg-[#f5f5f5]` for informational panels |
| Border           | `border border-[#e8e8e8]`; `border-2 border-[#f5f5f5]` for controls |
| Border radius    | `rounded-2xl` for cards; `rounded-xl` for controls; `rounded-full` for chips and actions |
| Text — primary   | `text-[#161d16]` and `text-[#1a1c19]` |
| Text — secondary | `text-[#424841]` and `text-[#636b74]` |
| Spacing          | `p-6`, `gap-4`, and `mt-5` between section title and content |
| Hover state      | `hover:bg-primary/90` for Save; `hover:bg-accent/90` for Cancel |
| Shadow           | `shadow-[0_4px_10px_rgba(26,34,43,0.04)]` |
| Accent usage     | `text-primary` section titles; `bg-[#c4edc4]` currency chips; `bg-[#436746]` title marker |

**Pattern notes:**
Business settings use white cards with restrained shadows and green uppercase
section titles. Configuration controls keep a 12px radius and low-contrast
borders. Currency selections use pale-green pill chips, while footer actions
use full pill buttons with the shared primary and accent colors.

Currency addition uses the Base UI Autocomplete pattern: keep the input
free-form for API-valid three-letter codes while filtering suggestions by
currency name or code. Its popup matches the shared select styling with
`rounded-xl bg-white shadow-lg ring-1 ring-[#e8e8e8]`; highlighted options use
`bg-primary/10 text-primary`.

Base currency, decimal places, and calculator currencies all use the shared
`SelectField` dropdown with a visible chevron. In the exchange calculator, both
rate surfaces use matching `rounded-xl`, `border-[#e8e8e8]`, and `bg-white`;
the base rate stays fixed at `1`, while the exchange rate uses a borderless
`Input`. Both compact currency dropdowns stay beside their labels and use
`rounded-lg`. The circular amber control rebases the selected currencies on
switch, with an amber hover and focus state so it reads as an interactive
action.

### Inventory Management

Files: `src/components/inventory/*.tsx`
Last updated: 2026-08-01

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-white`; `bg-[#f5f7f4]` for the inventory canvas |
| Border           | `border border-[#e4eae2]`; `divide-[#edf0ec]` for table rows |
| Border radius    | `rounded-2xl` for surfaces; `rounded-xl` for controls; `rounded-full` for filters, navigation, badges, and actions |
| Text — primary   | `text-[#161d16]` and `text-[#1a222b]` |
| Text — secondary | `text-[#657064]` and `text-[#7b857a]` |
| Spacing          | `p-5 sm:p-7` for forms; `px-5 py-4` for table and list rows; `gap-5` for form grids |
| Hover state      | `hover:bg-[#fbfcfa]` for data rows; shared shadcn variants for actions |
| Shadow           | `shadow-[0_8px_30px_rgba(26,34,43,0.05)]` |
| Accent usage     | `bg-primary/10 text-primary` for active/success states; `bg-accent/10 text-accent` for destructive/out-of-stock states |

**Pattern notes:**
Inventory surfaces adapt the supplied Figma examples to the dashboard baseline:
white green-gray bordered cards, compact responsive tables, full-pill primary
actions, and 12px form controls. Server data stays in the shared RTK Query
cache, while persistent product and stock filters use the inventory Redux
slice. Stock state badges consistently distinguish in-stock, low-stock, and
out-of-stock conditions with brand, warning, and accent colors.

Optional structured metadata should use a guided nested panel rather than a
raw JSON textarea. The stock batch panel uses `rounded-xl`,
`border-[#e4eae2]`, `bg-[#f8faf7]`, and `p-4`, plus a primary-tinted icon,
plain-language guidance, and standard inputs; the form assembles the API object
internally.

Category rows with subcategories use a ghost icon button as their disclosure
control. Keep the list expanded by default, expose `aria-expanded`, update the
accessible label between expand and collapse, and rotate the down chevron when
the nested rows are collapsed.

### Inventory Item Filters

File: `src/components/inventory/InventoryProductList.tsx`
Last updated: 2026-08-01

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-white` toolbar; `bg-[#f8faf7]` advanced panel; `bg-primary/5` active chips |
| Border           | `border border-[#e4eae2]`; `border-primary/20` active chips |
| Border radius    | `rounded-2xl` for the panel; `rounded-xl` for controls; `rounded-full` for chips |
| Text — primary   | `font-semibold text-[#161d16]` |
| Text — secondary | `text-sm text-[#657064]`; `text-xs font-medium text-[#31593b]` chips |
| Spacing          | `p-4 sm:p-5` panel; `gap-4` filter grid; `gap-2` chip row |
| Hover state      | `hover:bg-primary/10 hover:text-primary` chip removal; shared shadcn button variants |
| Shadow           | Inherits the inventory card shadow; none inside the filter panel |
| Accent usage     | `bg-primary text-white` applied-count badge; `bg-primary/5` active chips |

**Pattern notes:**
Keep the keyword, status, advanced-filter trigger, and barcode action in the
primary toolbar. Advanced fields belong in one responsive tinted panel and are
staged until **Apply filters**; sorting remains immediate. Applied values render
as individually removable chips followed by a low-emphasis **Clear all**
action. Pagination uses the API's zero-based page metadata but presents
one-based page numbers, a compact page-size select, and outlined Previous/Next
buttons. Result totals and the updating state remain in a quiet secondary bar
above the table. ID-backed filter selects must provide Base UI's `items` label
map so the closed trigger shows the human-readable name, never the stored ID.

### Modal Dialog

Files: `src/components/ui/dialog.tsx`, `src/components/inventory/ItemAttributeDialog.tsx`
Last updated: 2026-07-29

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-white`; backdrop `bg-[#0f1a12]/45` |
| Border           | `border border-[#e4eae2]` |
| Border radius    | `rounded-2xl` for the popup; `rounded-xl` for controls; `rounded-full` for footer actions |
| Text — primary   | `text-xl font-semibold text-[#161d16]` title |
| Text — secondary | `text-sm text-[#657064]` description |
| Spacing          | `p-6 sm:p-7`, `gap-5` between field groups, `gap-2` inside one |
| Hover state      | `hover:bg-primary/90` confirm; `hover:bg-accent/90` cancel |
| Shadow           | `shadow-[0_24px_60px_rgba(15,26,18,0.22)]` |
| Accent usage     | `bg-accent text-white` for the cancel pill; `bg-primary text-white` for confirm |

**Pattern notes:**
Built on Base UI's `Dialog`, so the popup portals to the body and centers with
`fixed top-1/2 left-1/2 -translate-1/2`. Confirm and cancel are equal-weight
full pills — green confirm on the right, red cancel on its left — matching the
supplied attribute screen. A dialog placed inside a page `<form>` must stop
propagation on its own submit: the portal moves the DOM node, but React still
bubbles the event through the component tree. Reset dialog state by keying the
inner form on the record being edited rather than syncing with an effect; this
React build rejects `setState` inside `useEffect`.

### Inventory Barcode Tools

Files: `src/components/inventory/BarcodePreview.tsx`,
`src/components/inventory/BarcodeScannerDialog.tsx`,
`src/components/inventory/InventoryProductForm.tsx`,
`src/components/inventory/StockAdjustmentForm.tsx`
Last updated: 2026-08-01

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-white` for the barcode; `bg-[#f8faf7]` for the result panel |
| Border           | `border border-[#e4eae2]` |
| Border radius    | `rounded-xl` for barcode/control panels; `rounded-2xl` for the result surface |
| Text — primary   | `text-lg font-semibold text-[#161d16]` |
| Text — secondary | `text-sm text-[#657064]` |
| Spacing          | `p-3` around barcode previews; `p-4` for lookup results; `gap-3` between controls |
| Hover state      | Shared shadcn button variants |
| Shadow           | Inherits the shared dialog popup shadow |
| Accent usage     | `bg-primary/10 text-primary` for the scanner icon; `bg-accent/5 text-accent` for lookup errors |

**Pattern notes:**
Barcode tools separate instant client feedback from authoritative backend
output: `react-barcode` renders a responsive CODE128 preview, while download
actions use the authenticated API-generated PNG. Scanner dialogs keep one
auto-focused, monospaced input so handheld USB and Bluetooth scanners can send
their usual keystrokes and Enter without camera permissions; manual entry is
the accessible fallback. On item creation, the barcode input and small outlined
icon-only generator stay together as one compact control group; retain its
accessible label and tooltip. The server generates a valid EAN-13 value and
verifies it against saved items. Stock-entry item selectors pair the existing
dropdown with an aligned scan icon; a successful lookup selects the item and
closes the scanner immediately so quantity entry can continue.

### Storefront Item Preview

Files: `src/components/inventory/ItemPreviewDialog.tsx`,
`src/components/inventory/DescriptionBlockEditor.tsx`,
`src/lib/api/attribute-icons.tsx`
Last updated: 2026-07-29

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-[#f7f8f7]` canvas with `bg-white` panels; `bg-[#f7f8f7]` spec tiles |
| Border           | `border border-[#e8e8e8]` on option chips; `border-primary` when selected; `border-2` on gallery thumbs and swatches |
| Border radius    | `rounded-2xl` panels; `rounded-lg` option chips; `rounded-full` swatches and quantity stepper |
| Text — primary   | `text-2xl font-bold text-[#161d16]` product name |
| Text — secondary | `text-sm leading-6 text-[#657064]` body copy |
| Spacing          | `p-6`, `gap-8` two-column split, `gap-4` between option rows, `gap-3` spec grid |
| Hover state      | `hover:border-[#cfd6cc]` on unselected chips and thumbs |
| Shadow           | Inherits the dialog popup shadow |
| Accent usage     | `text-accent` price and discount badge; `text-primary` badge eyebrow, selected chips and highlight icons |

**Pattern notes:**
Renders the shopper-facing detail view from the item being edited, so it is a
preview and never a live control: Add to Cart is an inert `div`, captioned as
preview-only, so nobody mistakes it for the storefront. Every value is derived
from item data — the discount badge appears only when `compareAtPrice` exceeds
the live price, and missing fields render as explicit empty states instead of
sample copy.

An attribute's `placement` decides where it lands, and it is the single concept
that lets one editor drive three regions: `OPTION` becomes chips (or colour
swatches when `type` is `COLOR`), `HIGHLIGHT` becomes a perk tile under Add to
Cart, `SPECIFICATION` feeds the spec grid, and `HIDDEN` never renders. A value
with `available: false` renders struck-through and disabled rather than being
hidden, so shoppers still see the size exists.

Description layout comes from `descriptionBlocks`, which nest exactly one level:
a `COLUMNS` block holds columns of leaf blocks and never another `COLUMNS`. The
editor enforces that by offering leaf types only inside a column. `SPEC_GRID`
carries no data of its own — it marks where the item's `SPECIFICATION`
attributes render, keeping one source of truth for spec tiles.

Icon keys are stored opaquely by the API and mapped to lucide glyphs in
`attribute-icons.tsx`, falling back to a neutral circle. Adding an icon is a
frontend-only change; never validate the key against a fixed enum.

### Account Menu

Files: `src/components/ui/menu.tsx`, `src/components/layout/UserMenu.tsx`
Last updated: 2026-07-29

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-white` popup; `bg-[#f2f5f1]` highlighted item; `bg-[#fdeceb]` highlighted sign-out |
| Border           | `border border-[#e4eae2]`; `bg-[#edf0ec]` separators |
| Border radius    | `rounded-2xl` popup; `rounded-xl` items; `rounded-full` trigger chip |
| Text — primary   | `text-[14px] text-[#161d16]` items |
| Text — secondary | `text-[12px] text-[#8a8f89]` "Signed in as" label |
| Spacing          | `p-1.5` popup, `px-3 py-2.5` items, `gap-2.5` icon to label |
| Hover state      | `data-highlighted:` on items; `data-popup-open:bg-[#f7f7f6]` on the chip |
| Shadow           | `shadow-[0_18px_44px_rgba(15,26,18,0.16)]` |
| Accent usage     | `text-[#b3352f]` sign-out, matching the destructive button ink |

**Pattern notes:**
Built on Base UI's `Menu`, so the popup portals to the body and closes as soon
as an item is clicked — anything that must outlive that click belongs outside
`MenuContent`. Sign-out therefore submits a hidden form rendered next to the
menu rather than a button inside it, because logout is a POST to `/api/logout`
(a GET logout is firable by any third-party page) and a form unmounted
mid-click never submits. The avatar chip is the shared trigger for both the
dashboard header and the app launcher; keep the two in sync through this
component instead of copying the markup.

### Dashboard Module Tile

File: src/components/dashboard/DasboardShell.tsx
Last updated: 2026-07-28

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-white` |
| Border           | `border` with `rgba(15,26,18,.07)` |
| Border radius    | `rounded-[24px]` |
| Text — primary   | `text-[15.5px] font-bold` |
| Text — secondary | `text-[12.5px] text-[#6b7a6e]` |
| Spacing          | `gap-4 px-[22px] pb-[26px] pt-[30px]` |
| Hover state      | `hover:-translate-y-[3px]` |
| Shadow           | `0 8px 20px -18px rgba(9,40,20,.3)` |
| Accent usage     | Per-module brand gradients with `focus-visible:outline-[#00932a]` |

**Pattern notes:**
Dashboard module tiles are draggable Next.js links. Keep the white surface,
subtle border and shadow, 24px radius, centered brand-gradient icon, and visible
green keyboard focus treatment consistent across future dashboard launchers.
