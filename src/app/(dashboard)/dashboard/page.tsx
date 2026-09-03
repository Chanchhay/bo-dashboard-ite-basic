import { TourButton } from "@/components/onboarding/TourButton";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";

/*
 * Nothing is loaded here any more.
 *
 * This page used to fetch the entire catalogue — `size=10000` — plus every
 * stock balance, on the server, on every visit, so that the dashboard could
 * count four numbers off them in the browser. Those four numbers now arrive
 * counted, from `/dashboard/overview`, and the ten thousand rows never leave
 * the database.
 *
 * The error banner went with it: each card reports its own failure now, so a
 * chart that cannot load no longer takes the page's figures down with it.
 */
export default function DashboardPage() {
    return (
        <div className="flex flex-col gap-6 pb-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Business Dashboard
                    </h1>
                    <p className="max-w-2xl text-[14px] text-[#5c6660] dark:text-[#94a3b8] mt-1">
                        Monitor live store metrics, channel revenues, cumulative profit, and stock inventory.
                    </p>
                </div>
                <TourButton />
            </div>

            {/* Overview Dashboard with 3 KPI cards & 2x2 Grid Charts (Profit, Channels Pie, Trending Category, Stock Inventory) */}
            <OverviewDashboard />
        </div>
    );
}
