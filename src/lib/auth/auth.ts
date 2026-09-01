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
    /*
     * `account_data` carries the Keycloak refresh token, so it has to outlive
     * the access token by a long way. Better Auth otherwise gives it
     * `session.cookieCache.maxAge || 300` — five minutes — while
     * `session_token` runs for seven days. The two drifting apart is a hard
     * five-minute idle timeout: the browser drops the account cookie, the
     * session cookie survives, and `src/proxy.ts` reads a session with no
     * tokens behind it and sends the user back to /login.
     *
     * `src/lib/auth/keycloak-token.ts` re-encodes the cookie with this same
     * `maxAge` as the payload's own `exp`, so one value covers both the
     * browser's Max-Age and the JWT's lifetime.
     */
    advanced: {
        cookies: {
            account_data: {
                attributes: {
                    // Matches the realm's refresh-token lifetime.
                    maxAge: 60 * 60 * 24 * 7,
                },
            },
        },
    },
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
