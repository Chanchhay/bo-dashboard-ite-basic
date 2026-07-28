// Server-only: pulls `next/headers`. Import from server components only.
import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import { permissionsForRoles, type Permission } from "@/lib/permissions";

type KeycloakClaims = {
    realm_access?: { roles?: string[] };
    resource_access?: Record<string, { roles?: string[] }>;
};

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

/** Deduped per render — the layout and the page both ask for this. */
export const getUserRoles = cache(async (): Promise<string[]> => {
    try {
        const requestHeaders = await headers();
        const session = await auth.api.getSession({ headers: requestHeaders });
        if (!session) return [];

        const tokens = await auth.api.getAccessToken({
            headers: requestHeaders,
            body: { providerId: "keycloak" },
        });
        if (!tokens.accessToken) return [];

        const claims = decodeClaims(tokens.accessToken);
        const realmRoles = claims?.realm_access?.roles ?? [];
        const clientRoles = Object.values(claims?.resource_access ?? {}).flatMap(
            (entry) => entry.roles ?? [],
        );

        return [...realmRoles, ...clientRoles];
    } catch {
        return [];
    }
});

export const getUserPermissions = cache(async (): Promise<Permission[]> => {
    return permissionsForRoles(await getUserRoles());
});
