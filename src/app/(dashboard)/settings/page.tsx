import { headers } from "next/headers";
import { redirect } from "next/navigation";

import UserProfileForm from "@/components/profile/UserProfileForm";
import { auth } from "@/lib/auth/auth";
import { TourButton } from "@/components/onboarding/TourButton";

export default async function SettingsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="pb-4 flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        User Profile
                    </h1>
                    <p className="mt-1 text-[15px] text-muted-foreground">
                        Manage your profile picture, account details, and
                        personal preferences.
                    </p>
                </div>
                <TourButton />
            </div>

            <div className="mt-2" data-tour="settings-profile-form">
                <UserProfileForm />
            </div>
        </div>
    );
}