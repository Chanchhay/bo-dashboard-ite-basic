import UserManagement from "@/components/user-management/UserManagement";
import { can } from "@/lib/permissions";
import { getUserPermissions, getUserRealmRoles } from "@/lib/permissions-server";

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
