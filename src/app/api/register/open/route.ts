import { cookies } from "next/headers";

import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { getPosChannelState } from "@/lib/api/pos-channel-backend";
import {
    normalizeRegisterSession,
    openSessionSchema,
    POS_SESSION_COOKIE,
    type RegisterSession,
} from "@/lib/api/pos-session";

export async function POST(request: Request) {
    try {
        const result = openSessionSchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const channel = await getPosChannelState();

        if (channel.known && !channel.open) {
            return Response.json(
                {
                    message: `${channel.channelName} is closed right now.`,
                    detail: channel.todayHours
                        ? `Today: ${channel.todayHours}`
                        : channel.summary,
                },
                { status: 409 },
            );
        }

        const session = await backendRequest<RegisterSession>(
            "/api/v1/sessions/open",
            {
                method: "POST",
                body: JSON.stringify(result.data),
            },
        );

        const cookieStore = await cookies();

        cookieStore.set(POS_SESSION_COOKIE, String(session.id), {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 16,
        });

        return Response.json(normalizeRegisterSession(session));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
