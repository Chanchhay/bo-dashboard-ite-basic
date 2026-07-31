import UserManagement from "@/components/user-management/UserManagement";
import { getUserRoles } from "@/lib/permissions-server";

/** The Keycloak client role guarding `/api/v1/admin/audit-logs`. */
const AUDIT_READ = "admin-audit:read";

export default async function EmployeesPage() {
    const roles = await getUserRoles();

    // Checking here only hides the tab — the backend still enforces access.
    const canReadAudits = roles.some(
        (role) => role.trim().toLowerCase() === AUDIT_READ,
    );

    return <UserManagement canReadAudits={canReadAudits} />;
}
