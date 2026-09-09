import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ChartCardSkeleton({ className }: { className?: string }) {
    return (
        <Card
            aria-hidden
            className={cn(
                "flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm",
                className,
            )}
        >
            <CardHeader className="p-0 border-b border-border/60 pb-4 mb-4">
                <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
                <div className="mt-2 h-4 w-64 animate-pulse rounded-md bg-muted/70" />
            </CardHeader>
            <CardContent className="p-0 h-72 sm:h-82 w-full pt-2">
                <div className="h-full w-full animate-pulse rounded-xl bg-muted/50" />
            </CardContent>
        </Card>
    );
}
