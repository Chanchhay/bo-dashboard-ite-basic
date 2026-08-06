import {
    BackendApiError,
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import { z } from "zod";
import {
    bakongSettingsSchema,
    type BakongSettings,
} from "@/lib/api/bakong";

const BAKONG_PATH = "/api/v1/businesses/payment-settings/bakong";

/**
 * The business's Bakong configuration, and whether KHQR can be offered.
 *
 * The terminal asks before showing a digital payment option: a cashier should
 * not discover that Bakong was never set up while a customer waits. Never
 * configured is a `404` from the backend and a plain `configured: false` here.
 */
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

/** Saves the configuration. Creating and updating are the same call. */
export async function PUT(request: Request) {
    try {
        const result = bakongSettingsSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                {
                    message: result.error.issues[0]?.message,
                    fieldErrors: z.flattenError(result.error).fieldErrors,
                },
                { status: 400 },
            );
        }

        // An absent token means "keep the one you have". Sending an empty
        // string would clear it and break KHQR without telling anyone.
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
