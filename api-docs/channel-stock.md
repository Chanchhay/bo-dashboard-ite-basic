# Channel stock allocation

What the back office sends and what the backend answers with. Implemented on
both sides — `backend-springboot/ite-sb-api`, `features/channel` — though it
postdates the `api.json` dump in this folder.

## The rule

There is still **one shelf**. An item has one balance per option, every sale
comes off that balance, and this feature adds no second pile of stock. What it
adds is a ceiling per channel: how many of the units on hand a channel is
allowed to sell.

| mode | meaning |
| --- | --- |
| `SHARED` | Every channel may sell everything on hand. Today's behaviour, and the default for every item that has never been split. |
| `ALLOCATED` | A channel may sell up to its allocation. What is not allocated is held back and sells nowhere. |

Availability a channel should be shown, per option:

```
SHARED      available = onHand
ALLOCATED   available = min(onHand, allocation.quantity - allocation.sold)
```

Two consequences the backend owns:

- **A sale consumes the allocation.** Giving Web ten and letting it sell ten
  again after every restock is a promise the shelf never made, so a sale on a
  channel raises that allocation's `sold` (or lowers its `quantity` — either,
  as long as it is not free to sell them twice).
- **Σ allocations ≤ onHand, per option.** The back office refuses to save an
  over-allocation, but the shelf moves after that — a stock-out can push an
  item under its allocations. Clamping with `min(onHand, …)` at read time is
  what keeps that from becoming an oversell.

Allocation is keyed by **option as well as channel**, because stock is counted
per option. `variantId` is null for an item with no options.

## Endpoints

Both are proxied by
`src/app/api/inventory/items/[itemId]/channel-stock/route.ts` onto:

```
GET  /api/v1/businesses/{businessId}/items/{itemId}/channel-stock
PUT  /api/v1/businesses/{businessId}/items/{itemId}/channel-stock
```

### GET — the split as it stands

An item nobody has split must answer `200` with `SHARED` and an empty list, not
`404`: "never split" is a real state, and the editor shows it as the off
position of a switch.

```json
{
  "itemId": "8f2c…",
  "mode": "ALLOCATED",
  "allocations": [
    {
      "salesChannelId": "b31a…",
      "channelName": "Web",
      "channelCode": "WEB",
      "variantId": "cc90…",
      "variantName": "Large",
      "quantity": 10,
      "sold": 3
    }
  ],
  "updatedAt": "2026-08-13T04:11:00Z"
}
```

### PUT — replace the split whole

Sent as one piece because it is decided as one. The list **replaces** what was
there: a channel left out has no allocation. `sold` is never sent — the
backend owns it.

```json
{
  "mode": "ALLOCATED",
  "allocations": [
    { "salesChannelId": "b31a…", "variantId": "cc90…", "quantity": 10 },
    { "salesChannelId": "b31a…", "variantId": "dd41…", "quantity": 4 }
  ]
}
```

`quantity` is a non-negative integer. Only channels the item is actually
published to are sent, and the backend rejects the rest with a `400` — an
unpublished channel holding stock back would be reserving it for a channel
that cannot sell it. Save the `item-channels` links first. Reject
`Σ quantity > onHand` per option with a `400`; the back office checks this
first, but it is reading a stock figure that may have moved since.

Answer with the same shape as `GET`.

## Where the backend enforces it

Storage is `items.channel_stock_mode` plus one `item_channel_stocks` row per
channel per option; `ItemChannelStockService` owns both halves of the rule.

| Path | What it does |
| --- | --- |
| Storefront checkout | `hasEnoughStock` now asks for the **web** channel's availability, so a basket cannot pass what the web was allocated. |
| Telegram / Messenger | `TelegramStockHelper` takes the channel, so the stock badge and the add-to-cart guard both read the bot's own share. |
| Messenger checkout | Had no stock guard of any kind; it now checks the basket against the Messenger allocation while the customer can still change it. |
| All four checkouts | On settle, each line raises `sold_quantity` on its channel's allocation beside the movement that takes the stock off the shelf. |
| POS | `requireAllocation` runs over every line before anything is written, so a till sale past the counter's share is refused with a `409` rather than half-recorded. Items on `SHARED` are untouched by it. |

The guard is deliberately only on the POS settle, not on the three that settle
after a QR payment: those already checked availability when the basket was
built, and throwing at settle would refuse an order the customer has paid for.

## What a screen shows

`GET /api/v1/businesses/{businessId}/sales-channels/{channelCode}/stock`
answers for a whole screen at once:

```json
[{ "itemId": "8f2c…", "variantId": "cc90…", "available": 7 }]
```

`available` is the allocation less what that channel sold, **not** capped to
the shelf — the screen holds the shelf figure already and shows the lower of
the two. Items the shop has never split are **absent** rather than reported at
their full shelf figure: they have no ceiling, and their absence is what lets a
screen fall back to plain on-hand without a flag.

The POS reads it and folds it into `stockFor`, so the option picker and the
card badges show the counter's share rather than the stockroom's total. An
item's own figure is the sum of what each of its options may sell, since the
cap is per option.

One gap left: `GET /api/v1/sales-channels/{code}/items` still carries no
quantity of its own. Nothing needs it now that the availability read exists,
but a client that only calls the items endpoint will still see an uncapped
catalogue.
