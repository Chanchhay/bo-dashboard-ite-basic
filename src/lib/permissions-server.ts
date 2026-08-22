// Server-only: pulls `next/headers`. Import from server components only.
import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import type { GrantedPermissions } from "@/lib/permissions";

type KeycloakClaims = {
    realm_access?: { roles?: string[] };
    resource_access?: Record<string, { roles?: string[] }>;
};

/**
 * The resource server whose client roles *are* our permissions.
 *
 * This mirrors the API exactly: `SecurityConfig.jwtAuthenticationConverter`
 * reads `resource_access["fluxipos-backend"].roles` and nothing else, so
 * reading any other client here would show menus for permissions the backend
 * would then refuse. Keycloak's own clients (`account`, `realm-management`)
 * live in the same claim and are excluded by the same rule.
 */
const RESOURCE_SERVER_CLIENT_ID = "fluxipos-backend";

/** Reads claims from a token this server just obtained from Keycloak. */
function decodeClaims(accessToken: string): KeycloakClaims | undefined {
    try {
        const payload = accessToken.split(".")[1];
        if (!payload) return undefined;

        return JSON.parse(
            Buffer.from(payload, "base64url").toString("utf8"),
        ) as KeycloakClaims;
    } catch {
        return undefined;
    }
}

/**
 * The permissions the current user holds, straight off the access token.
 *
 * A business role is a composite in Keycloak, so the token already lists the
 * atomic permissions it expands to — there is nothing to resolve here beyond
 * dropping the roles that belong to Keycloak rather than to us.
 *
 * Deduped per render — the layout and the page both ask for this.
 */
export const getUserPermissions = cache(
    async (): Promise<GrantedPermissions> => {
        try {
            const requestHeaders = await headers();
            const session = await auth.api.getSession({
                headers: requestHeaders,
            });
            if (!session) return [];

            const tokens = await auth.api.getAccessToken({
                headers: requestHeaders,
                body: { providerId: "keycloak" },
            });
            if (!tokens.accessToken) return [];

            const claims = decodeClaims(tokens.accessToken);

            // Realm roles are deliberately not read. A business role is a
            // realm role, but a *composite* one: Keycloak expands it into the
            // client roles below, so the permissions are already here and the
            // container's own name carries no authority of its own.
            return (
                claims?.resource_access?.[RESOURCE_SERVER_CLIENT_ID]?.roles ??
                []
            );
        } catch {
            return [];
        }
    },
);
