// Server-only: reads the Keycloak configuration from the environment.

const DEFAULT_END_SESSION_ENDPOINT =
    "https://auth.chanchhay.site/realms/istad-fluxipos-auth/protocol/openid-connect/logout";

const DISCOVERY_PATH = "/.well-known/openid-configuration";

/** Resolved once per server process — the realm's logout URL never moves. */
let cachedEndSessionEndpoint: string | undefined;

function issuerUrl() {
    const issuer =
        process.env.KEYCLOAK_ISSUER ||
        (process.env.NEXT_PUBLIC_KEYCLOAK_URL && process.env.NEXT_PUBLIC_KEYCLOAK_REALM
            ? `${process.env.NEXT_PUBLIC_KEYCLOAK_URL.replace(/\/+$/, "")}/realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM.replace(/^\/+|\/+$/g, "")}`
            : "https://auth.chanchhay.site/realms/istad-fluxipos-auth");
    return issuer.replace(/\/+$/, "");
}

async function endSessionEndpoint(issuer: string) {
    if (process.env.KEYCLOAK_END_SESSION_ENDPOINT) {
        return process.env.KEYCLOAK_END_SESSION_ENDPOINT;
    }

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
    return issuer ? `${issuer}/protocol/openid-connect/logout` : DEFAULT_END_SESSION_ENDPOINT;
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
    const endpoint =
        process.env.KEYCLOAK_END_SESSION_ENDPOINT ||
        (issuer ? await endSessionEndpoint(issuer) : DEFAULT_END_SESSION_ENDPOINT);

    const url = new URL(endpoint);
    url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);

    // Keycloak only honours `post_logout_redirect_uri` when the request can be
    // tied to a client. Keep client_id even when an ID token is available so
    // the request still identifies the client if the token hint has expired.
    const clientId =
        process.env.KEYCLOAK_CLIENT_ID ||
        process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ||
        "fluxipos-client";

    url.searchParams.set("client_id", clientId);

    if (idToken) {
        url.searchParams.set("id_token_hint", idToken);
    }

    return url.toString();
}
