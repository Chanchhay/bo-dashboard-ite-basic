import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import ManagerControls from "@/components/layout/ManagerControls";

const asset = (name: string) => `/post-login-assets/${name}`;

const modules = [
    {
        label: "Business Management",
        href: "/business/profile",
        icon: "business.svg",
        iconClassName: "h-[54px] w-14",
        background:
            "bg-[linear-gradient(155deg,#46ca22_0%,#0e8a1e_71.638%)]",
    },
    {
        label: "User Management",
        href: "/employees",
        icon: "users.svg",
        iconClassName: "size-[50px]",
        background:
            "bg-[linear-gradient(-40.5deg,#08832b_20.111%,#48d321_82.159%)]",
    },
    {
        label: "Inventory Management",
        href: "/inventory",
        icon: "inventory.svg",
        iconClassName: "size-20",
        background:
            "bg-[linear-gradient(-42.95deg,#0e7e2e_5.058%,#42d00e_80.714%)]",
    },
    {
        label: "Overview Dashboard",
        href: "/analytics",
        icon: "overview.svg",
        iconClassName: "size-20",
        background:
            "bg-[linear-gradient(-42.73deg,#008000_14.437%,#36f928_91.625%)]",
    },
    {
        label: "Sale Management",
        href: "/sales",
        icon: "sales.svg",
        iconClassName: "size-[70px]",
        background: "bg-[#e8e8e8]",
    },
    {
        label: "Account",
        href: "/settings",
        icon: "account.svg",
        iconClassName: "size-20",
        background: "bg-[#e8e8e8]",
    },
] as const;

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    const managerName = session?.user.name || "Alex Reed";

    return (
        <main className="min-h-screen bg-white text-[#161d16]">
            <header className="flex h-22 items-center justify-between pr-[27px]">
                <Image
                    src={asset("ipos-logo.png")}
                    alt="iPOS"
                    width={88}
                    height={88}
                    className="size-[88px] object-cover"
                    priority
                />

                <ManagerControls managerName={managerName} />
            </header>

            <nav
                aria-label="Management modules"
                className="mx-auto mt-[85px] grid w-full max-w-[1000px] grid-cols-1 justify-items-center gap-y-[82px] sm:grid-cols-2 lg:grid-cols-4"
            >
                {modules.map((module) => (
                    <Link
                        key={module.label}
                        href={module.href}
                        className="group flex h-[229px] w-[250px] flex-col items-center gap-3 rounded-[40px] px-5 outline-none transition-transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#006b26] focus-visible:ring-offset-4"
                    >
                        <span
                            className={`flex size-32 shrink-0 items-center justify-center rounded-[22px] ${module.background}`}
                        >
                            <Image
                                src={asset(module.icon)}
                                alt=""
                                width={80}
                                height={80}
                                className={module.iconClassName}
                            />
                        </span>
                        <span className="flex min-h-[59px] max-w-[184px] items-center justify-center text-center text-lg leading-[30px] font-light tracking-[0.7px]">
                            {module.label}
                        </span>
                    </Link>
                ))}
            </nav>
        </main>
    );
}
