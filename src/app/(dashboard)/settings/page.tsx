import { headers } from "next/headers";
import { redirect } from "next/navigation";

import UserProfileForm from "@/components/profile/UserProfileForm";
import { auth } from "@/lib/auth/auth";

export default async function SettingsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="pb-4 flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    User Profile
                </h1>
                <p className="mt-1 text-[15px] text-muted-foreground">
                    Manage your profile picture, account details, and personal preferences.
                </p>
            </div>

            <div className="mt-2">
                <UserProfileForm />
            </div>
        </div>
    );
}