import { sendPushToUsers } from "@/lib/push/send-push";

/**
 * The one door the external backend needs to know about.
 *
 * Everything this dashboard's own client code triggers (a POS sale, a parked
 * order) already runs through a Server Action instead, because it already
 * has a signed-in browser session to read the recipient off of. A channel
 * order has no browser in the loop at all — it lands on the backend's own
 * order endpoint, which is the only thing that knows it happened and who
 * should hear about it. This route exists so that backend can tell this one
 * "push this, to these Keycloak subjects" without either side needing to
 * know anything about the other's internals.
 *
 * Authenticated with a shared secret rather than a user session, because the
 * caller is a server, not a browser — set `PUSH_INTERNAL_SECRET` to the same
 * value on both sides and send it as `X-Push-Secret`.
 */
export async function POST(request: Request) {
  const configuredSecret = process.env.PUSH_INTERNAL_SECRET;

  if (!configuredSecret) {
    return Response.json(
      { message: "PUSH_INTERNAL_SECRET is not configured on this server." },
      { status: 503 },
    );
  }

  if (request.headers.get("x-push-secret") !== configuredSecret) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    userIds?: unknown;
    title?: unknown;
    body?: unknown;
    url?: unknown;
    tag?: unknown;
  } | null;

  const userIds = Array.isArray(body?.userIds)
    ? body.userIds.filter((id): id is string => typeof id === "string")
    : [];
  const title = typeof body?.title === "string" ? body.title : null;
  const messageBody = typeof body?.body === "string" ? body.body : null;

  if (userIds.length === 0 || !title || !messageBody) {
    return Response.json(
      { message: "userIds (string[]), title and body are required." },
      { status: 400 },
    );
  }

  const result = await sendPushToUsers(userIds, {
    title,
    body: messageBody,
    url: typeof body?.url === "string" ? body.url : undefined,
    tag: typeof body?.tag === "string" ? body.tag : undefined,
  });

  return Response.json(result);
}
