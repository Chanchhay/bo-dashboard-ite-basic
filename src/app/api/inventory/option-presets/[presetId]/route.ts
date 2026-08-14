import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import {
    optionPresetSchema,
    toOptionPresetRequest,
    type OptionPreset,
} from "@/lib/api/inventory";

type PresetRouteContext = {
    params: Promise<{ presetId: string }>;
};

export async function PUT(request: Request, context: PresetRouteContext) {
    try {
        const result = optionPresetSchema.safeParse(await request.json());

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const [{ presetId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const preset = await backendRequest<OptionPreset>(
            `/api/v1/businesses/${businessId}/option-presets/${encodeURIComponent(presetId)}`,
            {
                method: "PUT",
                body: JSON.stringify(toOptionPresetRequest(result.data)),
            },
        );

        return Response.json(preset);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(
    _request: Request,
    context: PresetRouteContext,
) {
    try {
        const [{ presetId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/option-presets/${encodeURIComponent(presetId)}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
