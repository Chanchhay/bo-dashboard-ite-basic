import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import type { BakongSettings } from "@/lib/api/bakong";

/**
 * Turns KHQR on or off without discarding the configuration.
 *
 * A merchant closing for the season should not have to retype their account
 * details to start taking payments again.
 */
export async function PATCH(request: Request) {
    try {
        const { active } = (await request.json()) as { active?: boolean };
        const segment = active ? "activate" : "deactivate";

        const settings = await backendRequest<BakongSettings>(
            `/api/v1/businesses/payment-settings/bakong/${segment}`,
            { method: "PATCH" },
        );

        return Response.json({
            configured: true,
            active: settings?.active ?? false,
            settings,
        });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
