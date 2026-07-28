import { cookies, headers } from "next/headers";

import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth/auth";
import { getUserPermissions } from "@/lib/permissions-server";
import { VIEW_MODE_COOKIE, parseViewMode } from "@/lib/view-mode";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [session, cookieStore, permissions] = await Promise.all([
        auth.api.getSession({ headers: await headers() }),
        cookies(),
        getUserPermissions(),
    ]);

    const mode = parseViewMode(cookieStore.get(VIEW_MODE_COOKIE)?.value);

    return (
        <AppShell
            managerName={session?.user.name || "Manager"}
            mode={mode}
            permissions={permissions}
        >
            {children}
        </AppShell>
    );
}
