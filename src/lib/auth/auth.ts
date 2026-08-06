import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth, keycloak } from "better-auth/plugins/generic-oauth";

const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID || "";
const keycloakClientSecret = process.env.KEYCLOAK_CLIENT_SECRET || "";
const keycloakIssuer = process.env.KEYCLOAK_ISSUER || "";

export const auth = betterAuth({
    appName: "iPOS Business Dashboard",
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [
        "https://business.fluxibiz.store",
        "https://fluxibiz.store",
    ],
    plugins: [
        genericOAuth({
            config: [
                keycloak({
                    clientId: keycloakClientId,
                    clientSecret: keycloakClientSecret,
                    issuer: keycloakIssuer,
                    pkce: true,
                }),
            ],
        }),
        nextCookies(),
    ],
});
