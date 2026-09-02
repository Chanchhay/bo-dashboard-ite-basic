import { headers } from "next/headers";

import {
  persistAuthCookies,
  resolveKeycloakAccessToken,
} from "@/lib/auth/keycloak-token";

/** Reads the `sub` claim without verifying — whoever reads this token back verifies it. */
function readSubject(accessToken: string): string | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;

    const json = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");

    const claims = JSON.parse(json) as { sub?: string };
    return claims.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * The signed-in user's Keycloak subject, for server code with no request
 * object of its own (a Server Action).
 *
 * Same id `/api/session-context` hands the browser for the socket and the
 * notification inbox — anything stored against a different id (Better
 * Auth's local `user.id`, say) is written under a key nothing else will ever
 * look up. Null means no session, or a Keycloak token this server could not
 * resolve; callers treat both as "not signed in".
 */
export async function getCurrentSubject(): Promise<string | null> {
  const requestHeaders = await headers();

  try {
    const resolved = await resolveKeycloakAccessToken(requestHeaders);
    await persistAuthCookies(resolved.setCookies);
    return readSubject(resolved.accessToken);
  } catch {
    return null;
  }
}
