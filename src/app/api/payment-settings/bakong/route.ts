import {
    BackendApiError,
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";

type BakongSettings = {
    accountId?: string;
    merchantName?: string;
    isActive?: boolean;
};

/**
 * Whether this business can take KHQR at all.
 *
 * The terminal asks before offering a digital payment: a cashier should not
 * discover that Bakong was never set up while a customer waits at the counter.
 * Not configured is a `404` from the backend and a plain `false` here.
 */
export async function GET() {
    try {
        const settings = await backendRequest<BakongSettings>(
            "/api/v1/businesses/payment-settings/bakong",
        );

        return Response.json({
            configured: true,
            active: settings?.isActive ?? true,
        });
    } catch (error) {
        if (error instanceof BackendApiError && error.status === 404) {
            return Response.json({ configured: false, active: false });
        }

        return backendErrorResponse(error);
    }
}
