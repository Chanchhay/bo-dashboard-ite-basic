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

export async function GET() {
    try {
        const businessId = await getInventoryBusinessId();
        const presets = await backendRequest<OptionPreset[]>(
            `/api/v1/businesses/${businessId}/option-presets`,
        );

        return Response.json(presets);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const result = optionPresetSchema.safeParse(await request.json());

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const businessId = await getInventoryBusinessId();
        const preset = await backendRequest<OptionPreset>(
            `/api/v1/businesses/${businessId}/option-presets`,
            {
                method: "POST",
                body: JSON.stringify(toOptionPresetRequest(result.data)),
            },
        );

        return Response.json(preset, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
