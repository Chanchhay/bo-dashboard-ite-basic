import UserManagement from "@/components/user-management/UserManagement";
import { can } from "@/lib/permissions";
import { getUserPermissions, getUserRealmRoles } from "@/lib/permissions-server";

/**
 * Roles the backend lets past `audit:read` on their own.
 *
 * Mirrors `permissionOrBusinessRole` in SecurityConfig. Kept in step because
 * `audit:read` is a new client role: until someone adds it in Keycloak nobody
 * holds it, and gating on the permission alone would ship the tab locked for
 * the owner it was built for.
 */
const AUDIT_ROLES = ["BUSINESS_OWNER", "BUSINESS", "ADMIN", "SUPER_ADMIN"];

export default async function EmployeesPage() {
    const [permissions, realmRoles] = await Promise.all([
        getUserPermissions(),
        getUserRealmRoles(),
    ]);

    const canReadAudits =
        can(permissions, "audit:read") ||
        realmRoles.some((role) => AUDIT_ROLES.includes(role));

    return <UserManagement canReadAudits={canReadAudits} />;
}
