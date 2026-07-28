import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import DashboardShell from "@/components/dashboard/DasboardShell";

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const managerName = session?.user.name || "Alex Reed";

    return <DashboardShell managerName={managerName} />;
}
