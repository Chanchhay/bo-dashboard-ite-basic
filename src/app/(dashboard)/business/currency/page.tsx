import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import BusinessCurrencyForm from "@/components/business/BusinessCurrencyForm";
import ManagerControls from "@/components/layout/ManagerControls";
import { auth } from "@/lib/auth/auth";

const asset = (name: string) => `/business-profile-assets/${name}`;

export default async function BusinessCurrencyPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    const managerName = session.user.name || "Alex Reed";

    return (
        <div className="min-h-screen bg-white text-[#161d16]">
            <header className="flex min-h-[93px] items-center justify-between gap-5 border-b border-[rgba(188,202,184,0.1)] bg-white/90 px-4 py-2">
                <div className="flex min-w-0 items-center gap-4">
                    <Link
                        href="/business/profile"
                        className="flex shrink-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        <span className="flex size-[70px] items-center justify-center rounded-xl bg-gradient-to-b from-[#008732] to-[#00210c]">
                            <Image
                                src={asset("business.svg")}
                                alt=""
                                width={43}
                                height={40}
                                className="h-10 w-[43px]"
                                priority
                            />
                        </span>
                        <span className="hidden w-[187px] text-xl leading-7 font-semibold text-[#161d16] sm:block">
                            Business Management
                        </span>
                    </Link>

                    <div className="hidden items-center gap-4 text-xl leading-7 font-semibold text-[#636b74] md:flex">
                        <Link
                            href="/dashboard"
                            className="rounded outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            Dashboard
                        </Link>
                        <span aria-hidden="true">/</span>
                        <span>Currency</span>
                    </div>
                </div>

                <ManagerControls managerName={managerName} />
            </header>

            <div className="lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
                <aside className="border-r border-[#e5e7eb] bg-white lg:min-h-[calc(100vh-93px)]">
                    <nav
                        aria-label="Business management"
                        className="flex gap-1.5 overflow-x-auto p-2 lg:flex-col"
                    >
                        <Link
                            href="/business/profile"
                            className="flex min-w-40 items-center gap-3 rounded-lg px-3 py-0.5 text-base leading-[35px] tracking-[0.96px] text-[#020409] outline-none focus-visible:ring-2 focus-visible:ring-primary lg:w-full"
                        >
                            <Image
                                src={asset("profile.svg")}
                                alt=""
                                width={24}
                                height={24}
                                className="size-6"
                            />
                            Profile
                        </Link>
                        <Link
                            href="/business/currency"
                            aria-current="page"
                            className="flex min-w-40 items-center gap-3 rounded-xl bg-primary/10 px-3 py-0.5 text-base leading-[35px] font-semibold tracking-[0.96px] text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary lg:w-full"
                        >
                            <Image
                                src={asset("currency.svg")}
                                alt=""
                                width={24}
                                height={24}
                                className="size-6"
                            />
                            Currency
                        </Link>
                    </nav>
                </aside>

                <main className="min-w-0 px-4 pb-7 sm:px-6">
                    <div className="flex h-[92px] flex-col justify-center">
                        <h1 className="text-[32px] leading-12 font-bold tracking-[-0.8px] text-[#161d16]">
                            Currency
                        </h1>
                        <p className="text-base leading-6 text-[#3d4a3c]">
                            Config currency for your business
                        </p>
                    </div>

                    <BusinessCurrencyForm />
                </main>
            </div>
        </div>
    );
}
