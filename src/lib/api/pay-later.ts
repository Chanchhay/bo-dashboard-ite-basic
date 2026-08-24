import { z } from "zod";

import type { Sale } from "@/lib/api/pos-order";

/** A sale rung up as "Pay later" — sold, stock gone, money not collected yet. */
export type PayLaterSale = Sale;

export const collectPayLaterSchema = z.object({
    paymentMethod: z.enum(["CASH", "DIGITAL"]),
    /** Absent means "the full amount owed". */
    receivedAmount: z.coerce.number().nonnegative().optional(),
});

export type CollectPayLaterInput = z.infer<typeof collectPayLaterSchema>;
