
const DEFAULT_END_SESSION_ENDPOINT =
    "https://auth.chanchhay.site/realms/istad-fluxipos-auth/protocol/openid-connect/logout";

const DISCOVERY_PATH = "/.well-known/openid-configuration";

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
    }

    return issuer ? `${issuer}/protocol/openid-connect/logout` : DEFAULT_END_SESSION_ENDPOINT;
}

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
