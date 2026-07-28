import { z } from "zod";

import { backendRequest } from "@/lib/api/backend";

type CurrentBusiness = {
    id: string;
};

export async function getInventoryBusinessId() {
    const business = await backendRequest<CurrentBusiness>(
        "/api/v1/businesses/me",
    );

    return encodeURIComponent(business.id);
}

export function inventoryValidationError(error: z.ZodError) {
    return Response.json(
        {
            message: "Check the submitted inventory information.",
            fieldErrors: z.flattenError(error).fieldErrors,
        },
        { status: 400 },
    );
}
