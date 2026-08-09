import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth, keycloak } from "better-auth/plugins/generic-oauth";

const keycloakClientId =
    process.env.KEYCLOAK_CLIENT_ID ||
    process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ||
    "";
const keycloakClientSecret = process.env.KEYCLOAK_CLIENT_SECRET || "";
const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || "";
const keycloakRealm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "";
const keycloakIssuer =
    process.env.KEYCLOAK_ISSUER ||
    (keycloakUrl && keycloakRealm ? `${keycloakUrl}/realms/${keycloakRealm}` : "");

export const auth = betterAuth({
    appName: "iPOS Business Dashboard",
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trustedOrigins: [
        "https://business.fluxibiz.store",
        "https://fluxibiz.store",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
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
