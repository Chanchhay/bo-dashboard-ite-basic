import { cookies, headers } from "next/headers";

import AppLauncher from "@/components/dashboard/AppLauncher";
import WelcomeIntro from "@/components/dashboard/WelcomeIntro";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { auth } from "@/lib/auth/auth";
import { getUserPermissions } from "@/lib/permissions-server";

export default async function AppsPage() {
    const [cookieStore, session, permissions] = await Promise.all([
        cookies(),
        auth.api.getSession({ headers: await headers() }),
        getUserPermissions(),
    ]);

    return (
        <>
            {cookieStore.get("ipos_welcome")?.value === "1" && <WelcomeIntro />}
            <AppLauncher
                managerName={session?.user.name || "Manager"}
                permissions={permissions}
            />
            <InstallAppButton label="Install FluxiBiz" floating />
        </>
    );
}
