import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth, keycloak } from "better-auth/plugins/generic-oauth";

const keycloakClientId =
    process.env.KEYCLOAK_CLIENT_ID ||
    process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ||
    "fluxipos-client";

const keycloakIssuer =
    process.env.KEYCLOAK_ISSUER ||
    (process.env.NEXT_PUBLIC_KEYCLOAK_URL && process.env.NEXT_PUBLIC_KEYCLOAK_REALM
        ? `${process.env.NEXT_PUBLIC_KEYCLOAK_URL.replace(/\/+$/, "")}/realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM.replace(/^\/+|\/+$/g, "")}`
        : "https://auth.chanchhay.site/realms/istad-fluxipos-auth");

export const auth = betterAuth({
    appName: "iPOS Business Dashboard",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trustedOrigins: [
        "https://administrator.fluxibiz.store",
        "https://fluxibiz.store",
        "https://www.fluxibiz.store",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    secret: process.env.BETTER_AUTH_SECRET || "2e20f532482fdc58c4cd0007433f0e782aee26da25ed49bfbe1e74dd3b130e55",
    plugins: [
        genericOAuth({
            config: [
                keycloak({
                    clientId: keycloakClientId,
                    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? "",
                    issuer: keycloakIssuer,
                    pkce: true,
                }),
            ],
        }),
        nextCookies(),
    ],
});
