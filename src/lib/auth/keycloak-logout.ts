// Server-only: reads the Keycloak configuration from the environment.

const DISCOVERY_PATH = "/.well-known/openid-configuration";

/** Resolved once per server process — the realm's logout URL never moves. */
let cachedEndSessionEndpoint: string | undefined;

function issuerUrl() {
    return process.env.KEYCLOAK_ISSUER?.trim().replace(/\/+$/, "");
}

async function endSessionEndpoint(issuer: string) {
    if (cachedEndSessionEndpoint) return cachedEndSessionEndpoint;

    try {
        const response = await fetch(`${issuer}${DISCOVERY_PATH}`, {
            cache: "no-store",
        });

        if (response.ok) {
            const document = (await response.json()) as {
                end_session_endpoint?: string;
            };

            if (document.end_session_endpoint) {
                cachedEndSessionEndpoint = document.end_session_endpoint;
                return cachedEndSessionEndpoint;
            }
        }
    } catch {
        // Discovery is a convenience, not a requirement.
    }

    // Every Keycloak realm serves logout here, so an unreachable discovery
    // document must not be the reason a user stays signed in.
    return `${issuer}/protocol/openid-connect/logout`;
}

/**
 * Builds the RP-initiated logout URL that ends the Keycloak SSO session.
 *
 * Clearing our own cookies is not enough: Keycloak would still hold a session
 * for this browser, so the next sign-in would silently walk straight back in
 * without ever showing the login form.
 *
 * Returns `null` when Keycloak is not configured, which leaves the caller to
 * finish with a local sign-out.
 */
export async function keycloakLogoutUrl({
    idToken,
    postLogoutRedirectUri,
}: {
    idToken?: string;
    postLogoutRedirectUri: string;
}) {
    const issuer = issuerUrl();
    if (!issuer) return null;

    const url = new URL(await endSessionEndpoint(issuer));
    url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);

    // Keycloak only honours `post_logout_redirect_uri` when the request can be
    // tied to a client. The ID token proves which session is ending and logs
    // out silently; `client_id` is the fallback, and it makes Keycloak render a
    // "do you want to log out?" confirmation first.
    if (idToken) {
        url.searchParams.set("id_token_hint", idToken);
    } else if (process.env.KEYCLOAK_CLIENT_ID) {
        url.searchParams.set("client_id", process.env.KEYCLOAK_CLIENT_ID);
    }

    return url.toString();
}
