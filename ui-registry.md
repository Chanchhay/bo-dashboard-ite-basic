# UI Registry

### FluxiBiz Brand Logo

File: src/components/brand/BrandLogo.tsx
Last updated: 2026-08-02

| Property         | Class |
| ---------------- | ----- |
| Background       | Transparent asset; none |
| Border           | None |
| Border radius    | None on the image; focus radius belongs to the surrounding link/button |
| Text — primary   | None; use the supplied wordmark rather than retyped brand text |
| Text — secondary | None |
| Spacing          | Clear space is controlled by the consuming surface |
| Hover state      | Inherit from the surrounding link/button |
| Shadow           | None |
| Accent usage     | Supplied navy-and-green artwork only; do not recolor or add effects |

**Pattern notes:**
Use the horizontal wordmark in navigation and other wide surfaces, the stacked
lockup on centered sign-in or PIN surfaces, and the monogram only in compact
square contexts such as the favicon. Always preserve the intrinsic aspect ratio,
use an empty image alt when the surrounding control already has an accessible
name, and never reconstruct the brand with live text.

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
Last updated: 2026-08-02

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
component instead of copying the markup. Space-constrained application headers
may use the compact avatar-only trigger, but the popup must still show the real
profile identity, profile link, and the same POST sign-out action.

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

### Sidebar Nested Action

File: src/components/layout/Sidebar.tsx
Last updated: 2026-08-01

| Property         | Class |
| ---------------- | ----- |
| Background       | Transparent disclosure row; `bg-primary` nested action |
| Border           | `border-l border-[#dcdcd8]` nested rail |
| Border radius    | `rounded-lg` disclosure row; `rounded-full` primary action |
| Text — primary   | `text-[#16181c]` active disclosure |
| Text — secondary | `text-[14px] text-[#8a8f89]` inactive disclosure |
| Spacing          | `px-3 py-2`, `mt-1 ml-3`, and `pl-3` |
| Hover state      | `hover:text-[#16181c]`; `hover:bg-primary/90` primary action |
| Shadow           | `shadow-[0_1px_2px_rgba(22,24,28,.08)]` when active |
| Accent usage     | `bg-primary text-white` for the nested action |

**Pattern notes:**
Use a native `details` disclosure for a sidebar item that owns actions rather
than a page. Keep the nested rail consistent with normal sidebar children, and
render the single entry action as the shared full-pill primary button. The
parent toggles disclosure only; navigation belongs to its child link.

### POS Transaction Surfaces

Files: `src/components/pos/order/payment.tsx`,
`src/components/pos/amount-received.tsx`,
`src/components/pos/order/new-order.tsx`,
`src/components/pos/order/receipt-list.tsx`,
`src/components/pos/order/receipt-detail-view.tsx`,
`src/components/pos/order/receipt-ticket.tsx`,
`src/components/pos/order/pain-receipt-view.tsx`,
`src/components/pos/order/date-range-filter.tsx`,
`src/components/pos/order/employee-filter.tsx`,
`src/components/pos/order/cancel-order-dialog.tsx`,
`src/components/pos/order/order-list.tsx`,
`src/components/pos/order/order-table.tsx`,
`src/components/pos/navbar-pos/navbar.tsx`,
`src/components/pos/cash-register.tsx`,
`src/components/pos/pos-terminal.tsx`,
`src/components/pos/pos-screen.tsx`,
`src/components/pos/pos-button.tsx`,
`src/app/pos/register/page.tsx`
Last updated: 2026-08-02

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-white`; `bg-[#eff1f3]` dialog headers; `bg-[#f5f5f5]` secondary panels |
| Border           | `border-[#bbcabf]` inputs and filters; `border-[#c6c6cd]` table and summary surfaces |
| Border radius    | `rounded-[24px] sm:rounded-[30px]` dialogs; `rounded-[20px]` to `rounded-[25px]` controls and actions; `rounded-xl` cards and tables |
| Text — primary   | `text-[#191c1e]` and `text-[#37423b]` |
| Text — secondary | `text-[#636b74]` and `text-[#45464d]` |
| Spacing          | Responsive `p-4 sm:p-8 lg:p-10`; `gap-3` controls; safe-area bottom padding on mobile tabs and overlays |
| Hover state      | `hover:bg-primary/90`; `focus-visible:ring-2 focus-visible:ring-primary/25` |
| Shadow           | `shadow-[0_24px_60px_rgba(15,26,18,0.22)]` on transactional dialogs |
| Accent usage     | FluxiBiz green for totals and primary actions; red for change and cancel; amber for cash |

**Pattern notes:**
Match the supplied POS layouts closely at desktop width, then stack summary,
payment, filter, and action regions for narrow screens without shrinking tap
targets. Transaction dialogs use a large rounded shell and clear icon-led
heading; payment keeps order summary and method details in separate columns.
Below 360px, paired dialog actions stack; short screens keep the header and
actions fixed while the body scrolls. Mobile cart tables reduce cell padding,
retain touch-sized controls, and respect device safe areas.
Receipt tables derive rows and totals only from the existing data source and
show an explicit empty state instead of design-sample transactions. Styling
work must not replace API hooks, payment mutations, KHQR status handling, or
callback behavior.

The Receipts tab follows Figma node `3627:27345`: three equal summary cards,
50px date and active-register-user controls, a shadowed white transaction
table with 66px headers and 90px rows, compact success pills, and quiet square
row actions. At narrow widths, replace the table with stacked receipt cards and
keep **View receipt** and **Print** as separate sibling controls. Direct row
printing must fetch the selected API receipt and render the shared ticket
offscreen; it must never print the receipts page. The paid-order list supports
real created-date filtering, but historical cashier and payment-method cells
remain visibly unavailable until the backend exposes sale history. The Cash
summary may use the active register session total; never derive KHQR by
subtracting unrelated totals.

POS catalog search is a controlled field shared between desktop and mobile.
Match against the API-backed item name, code, SKU, and barcode. Populate the
category selector from real POS-channel item groups, keep IDs internal while
showing names, and apply search and category together. A filtered empty result
must offer **Clear filters**; it is distinct from an empty POS sales channel.
The category menu follows Figma node `2538:34330`: an anchored dropdown exactly
as wide as its trigger, offset 4px below it, with a `rounded-xl` translucent
white surface, `border-[#334155]`, strong lower shadow, 18px description text,
and 24px checkbox tiles. The selected tile uses `bg-primary` with a white check;
unselected tiles use `bg-[#f5f5f5]`. Keep this as an accessible Base UI Select,
not a detached dialog or fixed-width popup.

Open-order cards use a white `rounded-2xl` surface, blue customer glyph,
amber pencil, red trash action, and three compact metric tiles for time, item
quantity, and total. Keep the card body as the accessible edit button and the
trash control as a separate sibling action; never nest interactive controls.
Their data comes from the authenticated pending-order filter; never recreate
the Figma sample names or totals. **New order** names and parks the current cart
without cancelling it, while **Edit** changes the terminal's HTTP-only
current-order cookie and returns to Point of Sale. **Save** parks the edited
order again. Cancellation always uses a red warning dialog with **Keep order**
and **Cancel order** actions, waits for backend success before removing the
card, and reports failures without closing the dialog. Only an explicit,
confirmed abandon action may call the cancel endpoint. Track edit mode by the
edited order ID rather than a boolean; when that same order is cancelled, clear
edit mode so **Save** returns to **New order** and cannot reappear when the next
cart item is selected.

Register-entry failures use the existing centered POS card surface:
`rounded-3xl bg-white p-6 shadow-sm` on the `bg-[#f4f4f5]` canvas. When the
shared register state is unknown, never show the opening keypad. Explain that
no new session was opened and provide equal-width full-pill **Back** and
**Try again** actions; the retry uses `bg-primary` and the standard primary
focus ring.

### Business Receipt Ticket

File: `src/components/pos/order/receipt-ticket.tsx`
Last updated: 2026-08-02

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-white`; `bg-[#f4fbed]` for the total panel |
| Border           | `border-dashed border-[#9aa79a]`; `border-[#cfe7ca]` total panel |
| Border radius    | `rounded-[7px]`; `rounded-[5px]` total panel |
| Text — primary   | `text-[#0e140e]` and `text-[#006b26]` |
| Text — secondary | `text-[#3d4a3c]` and `text-[#6d7a77]` |
| Spacing          | `px-[18px] sm:px-[22px] pt-5 pb-[26px]`; compact `py-[5px]` line rows |
| Hover state      | Actions use `hover:bg-primary/90` or `hover:bg-[#fbfcfa]` |
| Shadow           | `shadow-[0_2px_5px_rgba(20,20,19,0.12)]` |
| Accent usage     | Figma green `#006b26`; discount red `#d14341`; pale green total |

**Pattern notes:**
Match Figma node `3616:26666`: a compact 559px-wide paper ticket, 7px shell
radius, 22px padding, dashed separators, mono amounts, narrow quantity and
amount columns, and a pale-green total panel. The immediate paid view and
historical receipt detail must render this same ticket. Identity comes from the
authenticated business profile: use the real logo, name, address, phone, and
website, with initials only when the owner has no logo. Invoice, VAT number,
line items, totals, currency, and issue time come from backend order or receipt
records. Bilingual field labels are static UI copy, but never print sample tax
amounts, Khmer business or product names, staff names, payment methods,
received amounts, or change. Immediate `SaleResponse` data may show payment
detail; historical views omit it until a sales-history API exists. Display
currency conversion may render only from the real business-currency API.
Printing isolates `.receipt-ticket` from every other mounted POS element and
uses the standard `80mm` thermal-paper width with `4mm` print padding. Measure
the ticket at that width before every print and set the page height from its
current content so item rows are never clipped and short receipts do not gain
fixed blank space. Remove the screen shadow and radius, preserve print colors,
and do not allow navigation, actions, or overlays into the printed result.
