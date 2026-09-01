import { cookies } from "next/headers";

import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getPosChannelState } from "@/lib/api/pos-channel-backend";
import {
    normalizeRegisterSession,
    openSessionSchema,
    POS_SESSION_COOKIE,
    type RegisterSession,
} from "@/lib/api/pos-session";

/**
 * Opens the shift.
 *
 * Each business has exactly one register, provisioned with the account, so the
 * backend resolves it from the caller — no register id to pass.
 *
 * The returned session id is also stored in an httpOnly cookie: closing the
 * register later needs it, and a cashier who reloads mid-shift must not be
 * locked out of their own drawer.
 */
export async function POST(request: Request) {
    try {
        const result = openSessionSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        // A till may not open while the channel it sells through is shut.
        // Enforced here rather than only on the button: the rule has to hold
        // for any caller, not just the one that renders our UI.
        //
        // An unknown answer permits opening — a backend blip is not the shop
        // being closed, and failing shut would stop trading over a hiccup.
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
            // A shift is a working day at most. A cookie outliving the session
            // would strand the terminal on an id the backend already closed.
            maxAge: 60 * 60 * 16,
        });

        return Response.json(normalizeRegisterSession(session));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
