import { cookies } from "next/headers";

import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import {
    closeSessionSchema,
    normalizeRegisterSession,
    POS_SESSION_COOKIE,
    type RegisterSession,
} from "@/lib/api/pos-session";

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
        const result = closeSessionSchema.safeParse(await readJsonBody(request));

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

        cookieStore.delete(POS_SESSION_COOKIE);

        return Response.json(normalizeRegisterSession(session));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
