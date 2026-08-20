import UserManagement from "@/components/user-management/UserManagement";
import { TourButton } from "@/components/onboarding/TourButton";
import { getUserRoles } from "@/lib/permissions-server";

/** The Keycloak client role guarding `/api/v1/admin/audit-logs`. */
const AUDIT_READ = "admin-audit:read";

export default async function EmployeesPage() {
    const roles = await getUserRoles();

    // Checking here only hides the tab — the backend still enforces access.
    const canReadAudits = roles.some(
        (role) => role.trim().toLowerCase() === AUDIT_READ,
    );

    return (
        <div className="pb-4">
            <div className="flex items-center justify-between gap-4 mb-5">
                <p className="max-w-2xl text-[15px] text-[#5c6660] dark:text-[#94a3b8]">
                    Manage staff accounts, assign security role permissions, and view system audit logs.
                </p>
                <TourButton />
            </div>

            <UserManagement canReadAudits={canReadAudits} />
        </div>
    );
}
