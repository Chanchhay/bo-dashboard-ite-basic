import { z } from "zod";

import type { Sale } from "@/lib/api/pos-order";


export type PayLaterSale = Sale;

export const collectPayLaterSchema = z.object({
    paymentMethod: z.enum(["CASH", "DIGITAL"]),
    
    receivedAmount: z.coerce.number().nonnegative().optional(),
});

export type CollectPayLaterInput = z.infer<typeof collectPayLaterSchema>;
