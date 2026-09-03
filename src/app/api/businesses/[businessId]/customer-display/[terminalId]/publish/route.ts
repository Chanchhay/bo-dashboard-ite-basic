import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";

type RouteContext = {
  params: Promise<{ businessId: string; terminalId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId, terminalId } = await context.params;
    const body = await readJsonBody(request);

    await backendRequest<void>(
      `/api/v1/businesses/${encodeURIComponent(businessId)}/customer-display/${encodeURIComponent(terminalId)}/publish`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    return backendErrorResponse(error);
  }
}
