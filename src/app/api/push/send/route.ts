import { sendPushToUsers } from "@/lib/push/send-push";

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

  console.log(`[push] POST /api/push/send userIds=${JSON.stringify(userIds)} ->`, result);

  return Response.json(result);
}
