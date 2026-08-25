import UserManagement from "@/components/user-management/UserManagement";
import { can } from "@/lib/permissions";
import { getUserPermissions } from "@/lib/permissions-server";

export default async function EmployeesPage() {
    const canReadAudits = can(await getUserPermissions(), "admin-audit:read");

    return <UserManagement canReadAudits={canReadAudits} />;
}

