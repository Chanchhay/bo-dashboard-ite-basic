import {
    BackendApiError,
    backendErrorResponse,
    backendRequest,
    readJsonBody,
} from "@/lib/api/backend";
import { z } from "zod";
import {
    bakongSettingsSchema,
    type BakongSettings,
} from "@/lib/api/bakong";

const BAKONG_PATH = "/api/v1/businesses/payment-settings/bakong";

export async function GET() {
    try {
        const settings = await backendRequest<BakongSettings>(BAKONG_PATH);

        return Response.json({
            configured: true,
            active: settings?.active ?? false,
            settings,
        });
    } catch (error) {
        if (error instanceof BackendApiError && error.status === 404) {
            return Response.json({
                configured: false,
                active: false,
                settings: null,
            });
        }

        return backendErrorResponse(error);
    }
}

export async function PUT(request: Request) {
    try {
        const result = bakongSettingsSchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return Response.json(
                {
                    message: result.error.issues[0]?.message,
                    fieldErrors: z.flattenError(result.error).fieldErrors,
                },
                { status: 400 },
            );
        }

        const { apiToken, ...rest } = result.data;
        const body = apiToken ? { ...rest, apiToken } : rest;

        const settings = await backendRequest<BakongSettings>(BAKONG_PATH, {
            method: "PUT",
            body: JSON.stringify(body),
        });

        return Response.json({
            configured: true,
            active: settings?.active ?? false,
            settings,
        });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
