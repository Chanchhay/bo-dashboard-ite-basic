import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth, keycloak } from "better-auth/plugins/generic-oauth";

const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID;
const keycloakClientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
const keycloakIssuer = process.env.KEYCLOAK_ISSUER;

if (!keycloakClientId) {
    throw new Error("KEYCLOAK_CLIENT_ID is required");
}

if (!keycloakIssuer) {
    throw new Error("KEYCLOAK_ISSUER is required");
}

export const auth = betterAuth({
    appName: "iPOS Business Dashboard",
    plugins: [
        genericOAuth({
            config: [
                keycloak({
                    clientId: keycloakClientId,
                    clientSecret: keycloakClientSecret ?? "",
                    issuer: keycloakIssuer,
                    pkce: true,
                }),
            ],
        }),
        nextCookies(),
    ],
});
