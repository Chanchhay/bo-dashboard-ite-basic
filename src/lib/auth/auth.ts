import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth, keycloak } from "better-auth/plugins/generic-oauth";

import { ID_TOKEN_COOKIE, useSecureCookies } from "./id-token-cookie";

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
    hooks: {
        /*
         * Copy the Keycloak ID token into a cookie the moment a session is
         * created. See `ID_TOKEN_COOKIE` — the account record it is read from
         * here does not outlive the server process, and sign-out needs the
         * token later to end the Keycloak SSO session.
         */
        after: createAuthMiddleware(async (ctx) => {
            const newSession = ctx.context.newSession;
            if (!newSession) return;

            const accounts = await ctx.context.internalAdapter.findAccounts(
                newSession.user.id,
            );
            const idToken = accounts.find(
                (account) => account.providerId === "keycloak",
            )?.idToken;

            if (!idToken) return;

            // Expiring alongside the session keeps the two from outliving each
            // other: a stale hint is refused by Keycloak, and a missing one
            // puts us back in the silent-re-login loop.
            const maxAge = Math.floor(
                (new Date(newSession.session.expiresAt).getTime() - Date.now()) /
                    1000,
            );

            if (maxAge <= 0) return;

            ctx.setCookie(ID_TOKEN_COOKIE, idToken, {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies(),
                maxAge,
            });
        }),
    },
});
