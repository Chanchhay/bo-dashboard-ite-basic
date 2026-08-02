import { cookies } from "next/headers";

import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import {
    closeSessionSchema,
    normalizeRegisterSession,
    POS_SESSION_COOKIE,
    type RegisterSession,
} from "@/lib/api/pos-session";

/**
 * Ends the shift.
 *
 * The expected total and the difference are the backend's to decide — it owns
 * the sales that ran through the drawer. The terminal only reports what was
 * counted, and shows back whatever reconciliation the backend returns.
 */
export async function POST(request: Request) {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(POS_SESSION_COOKIE)?.value;

    if (!sessionId) {
        return Response.json(
            { message: "No open register to close." },
            { status: 409 },
        );
    }

    try {
        const result = closeSessionSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const session = await backendRequest<RegisterSession>(
            `/api/v1/sessions/${encodeURIComponent(sessionId)}/close`,
            {
                method: "POST",
                body: JSON.stringify(result.data),
            },
        );

        // The shift is over either way — holding the id would only let the
        // terminal act on a session the backend has already closed.
        cookieStore.delete(POS_SESSION_COOKIE);

        return Response.json(normalizeRegisterSession(session));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
