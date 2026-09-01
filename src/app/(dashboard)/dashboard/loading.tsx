import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
    return (
        <div className="flex flex-col gap-6 pb-4">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56 rounded-lg" />
                    <Skeleton className="h-4 w-96 max-w-full rounded-md" />
                </div>
                <Skeleton className="h-9 w-24 rounded-full shrink-0" />
            </div>
            <DashboardSkeleton />
        </div>
    );
}
