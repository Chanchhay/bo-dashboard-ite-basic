import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import type { AuditLogPage } from "@/lib/api/user-management";

/** Only the filters the Audits tab exposes are forwarded. */
const FORWARDED_PARAMS = [
    "actionType",
    "targetType",
    "targetId",
    "actorId",
    "from",
    "to",
    "keyword",
    "page",
    "size",
] as const;

export async function GET(request: Request) {
    try {
        const incoming = new URL(request.url).searchParams;
        const query = new URLSearchParams();

        for (const key of FORWARDED_PARAMS) {
            const value = incoming.get(key);
            if (value) query.set(key, value);
        }

        // `sort` is repeatable, so it can't come through the loop above.
        if (!query.has("sort")) query.set("sort", "createdAt,desc");

        const logs = await backendRequest<AuditLogPage>(
            `/api/v1/admin/audit-logs?${query.toString()}`,
        );

        return Response.json(logs);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
