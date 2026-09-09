import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import type { BakongSettings } from "@/lib/api/bakong";

export async function PATCH(request: Request) {
    try {
        const { active } = (await readJsonBody(request)) as { active?: boolean };
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
