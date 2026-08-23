import UserManagement from "@/components/user-management/UserManagement";
import { TourButton } from "@/components/onboarding/TourButton";
import { can } from "@/lib/permissions";
import { getUserPermissions } from "@/lib/permissions-server";

export default async function EmployeesPage() {
    // Checking here only hides the tab — the backend still enforces access
    // on `/api/v1/admin/audit-logs`.
    const canReadAudits = can(await getUserPermissions(), "admin-audit:read");

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
