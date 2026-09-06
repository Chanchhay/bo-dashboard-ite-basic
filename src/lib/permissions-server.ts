
import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import type { GrantedPermissions } from "@/lib/permissions";

type KeycloakClaims = {
    realm_access?: { roles?: string[] };
    resource_access?: Record<string, { roles?: string[] }>;
};


const RESOURCE_SERVER_CLIENT_ID = "fluxipos-backend";


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


const getClaims = cache(async (): Promise<KeycloakClaims | undefined> => {
    try {
        const requestHeaders = await headers();
        const session = await auth.api.getSession({
            headers: requestHeaders,
        });
        if (!session) return undefined;

        const tokens = await auth.api.getAccessToken({
            headers: requestHeaders,
            body: { providerId: "keycloak" },
        });
        if (!tokens.accessToken) return undefined;

        return decodeClaims(tokens.accessToken);
    } catch {
        return undefined;
    }
});

export const getUserPermissions = cache(
    async (): Promise<GrantedPermissions> => {
        const claims = await getClaims();

        return claims?.resource_access?.[RESOURCE_SERVER_CLIENT_ID]?.roles ?? [];
    },
);

/**
 * The realm roles on the caller's token — `BUSINESS_OWNER` and friends.
 *
 * Separate from the permissions above, which are client roles. The backend
 * grants some endpoints to either one, and a page that gates on permissions
 * alone shows an owner a locked screen for something the API would have
 * answered.
 */
export const getUserRealmRoles = cache(async (): Promise<readonly string[]> => {
    const claims = await getClaims();

    return claims?.realm_access?.roles ?? [];
});
