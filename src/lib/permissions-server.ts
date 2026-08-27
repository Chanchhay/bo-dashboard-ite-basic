
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

            
            return (
                claims?.resource_access?.[RESOURCE_SERVER_CLIENT_ID]?.roles ??
                []
            );
        } catch {
            return [];
        }
    },
);
