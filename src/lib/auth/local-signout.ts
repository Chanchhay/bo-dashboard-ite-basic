import { auth } from "@/lib/auth/auth";

/**
 * Drops this app's own session cookies and nothing else.
 *
 * Deliberately not `/api/logout`: that one also calls Keycloak's end-session
 * endpoint, and the realm keeps a single SSO session per browser. Ending it
 * here would sign the same person out of the administrator app in the next
 * tab, which is exactly the session an administrator arriving here still
 * needs. Clearing our cookies leaves that session untouched.
 *
 * Returns Better Auth's full cookie cleanup, chunked cookies included, for the
 * caller to append onto its response.
 */
export async function clearLocalSession(requestHeaders: Headers) {
    try {
        const { headers: responseHeaders } = await auth.api.signOut({
            headers: requestHeaders,
            returnHeaders: true,
        });

        return responseHeaders.getSetCookie();
    } catch {
        // Nothing to clear is the same outcome as a successful clear.
        return [];
    }
}
