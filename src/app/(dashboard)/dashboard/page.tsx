import { TourButton } from "@/components/onboarding/TourButton";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";

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

            <OverviewDashboard />
        </div>
    );
}
