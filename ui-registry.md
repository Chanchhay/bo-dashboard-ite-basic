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
Last updated: 2026-07-28

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

### Inventory Management

Files: `src/components/inventory/*.tsx`
Last updated: 2026-07-28

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
