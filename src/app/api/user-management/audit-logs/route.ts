import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { toPageResult } from "@/lib/api/pagination";
import type { AuditLogPage } from "@/lib/api/user-management";


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

        
        if (!query.has("sort")) query.set("sort", "createdAt,desc");

        // The shop's own log, not `/admin/audit-logs`. That one is the
        // platform's record of FluxiBiz staff acting on businesses: it holds
        // no business column, so there is nothing in it belonging to the
        // caller's shop and everything in it belonging to other people's.
        //
        // Nothing here names a business. The backend resolves it from the
        // token, so another shop's log is not something a caller can ask for
        // by editing a query string.
        const logs = await backendRequest<any>(
            `/api/v1/audit-logs?${query.toString()}`,
        );

        return Response.json(toPageResult(logs));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
