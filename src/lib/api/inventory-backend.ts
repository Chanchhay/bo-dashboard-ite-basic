import { z } from "zod";

import {
    getCurrentBusinessId,
    validationErrorResponse,
} from "@/lib/api/business-backend";

export const getInventoryBusinessId = getCurrentBusinessId;

export function inventoryValidationError(error: z.ZodError) {
    return validationErrorResponse(
        error,
        "Check the submitted inventory information.",
    );
}
