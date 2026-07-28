import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import ManagerControls from "@/components/layout/ManagerControls";
import UserProfileForm from "@/components/profile/UserProfileForm";
import { auth } from "@/lib/auth/auth";

const asset = (name: string) => `/post-login-assets/${name}`;

export default async function UserProfilePage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    const managerName = session.user.name || "User";

    return (
        <div className="min-h-screen bg-[#f4f7f3] text-[#161d16]">
            <header className="flex min-h-22 items-center justify-between gap-4 border-b border-[#e4eae2] bg-white px-4 pr-6 sm:px-6">
                <Link
                    href="/dashboard"
                    className="flex shrink-0 items-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Back to dashboard"
                >
                    <Image
                        src={asset("ipos-logo.png")}
                        alt="iPOS"
                        width={72}
                        height={72}
                        className="size-[72px] object-cover"
                        priority
                    />
                </Link>
                <ManagerControls managerName={managerName} />
            </header>

            <main className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 lg:py-10">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-[#566154] outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    <ChevronLeft className="size-4" />
                    Dashboard
                </Link>

                <div className="mt-5 mb-7">
                    <p className="text-sm font-semibold tracking-[0.12em] text-primary uppercase">
                        Account
                    </p>
                    <h1 className="mt-1 text-3xl leading-tight font-bold tracking-[-0.6px] text-[#161d16] sm:text-[36px]">
                        User profile
                    </h1>
                    <p className="mt-2 max-w-2xl text-base leading-6 text-[#5f6a5d]">
                        Review your account details and keep your personal
                        information up to date.
                    </p>
                </div>

                <UserProfileForm />
            </main>
        </div>
    );
}
