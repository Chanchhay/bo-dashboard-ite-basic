import { auth } from "@/lib/auth/auth";

export async function clearLocalSession(requestHeaders: Headers) {
    try {
        const { headers: responseHeaders } = await auth.api.signOut({
            headers: requestHeaders,
            returnHeaders: true,
        });

        return responseHeaders.getSetCookie();
    } catch {
        return [];
    }
}
