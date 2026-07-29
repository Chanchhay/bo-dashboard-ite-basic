import { headers } from "next/headers";

import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth/auth";
import { getUserPermissions } from "@/lib/permissions-server";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [session, permissions] = await Promise.all([
        auth.api.getSession({ headers: await headers() }),
        getUserPermissions(),
    ]);

    return (
        <AppShell
            managerName={session?.user.name || "Manager"}
            permissions={permissions}
        >
            {children}
        </AppShell>
    );
}
