import { headers } from "next/headers";

import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth/auth";
import { requireBusiness } from "@/lib/api/business-guard";
import { getUserPermissions } from "@/lib/permissions-server";
import "@/app/globals.css";


export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Before anything renders: an account with no business has nothing here.
    await requireBusiness();

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
