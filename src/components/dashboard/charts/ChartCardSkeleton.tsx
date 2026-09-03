import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Holds a chart card's shape while its chart library is being fetched.
 *
 * The height matches the card it stands in for, so the dashboard does not
 * jump when the real chart arrives — the whole point of loading them late is
 * lost if the page reflows underneath the reader.
 */
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
