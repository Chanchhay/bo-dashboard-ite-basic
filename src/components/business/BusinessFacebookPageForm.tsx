"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LoaderCircle, CheckCircle2, AlertCircle, Link2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import {
    useGetFacebookPageSettingQuery,
    useLazyGetFacebookConnectUrlQuery,
    useDisconnectFacebookPageMutation,
    useActivateFacebookPageMutation,
    useDeactivateFacebookPageMutation,
    useSetFacebookMiniAppEnabledMutation,
} from "@/services/facebookPageApi";

export function BusinessFacebookPageForm() {
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const { data, isLoading } = useGetFacebookPageSettingQuery();
    const [fetchConnectUrl, { isFetching: isGettingUrl }] = useLazyGetFacebookConnectUrlQuery();
    const [disconnectPage, { isLoading: isDisconnecting }] = useDisconnectFacebookPageMutation();
    const [activatePage, { isLoading: isActivating }] = useActivateFacebookPageMutation();
    const [deactivatePage, { isLoading: isDeactivating }] = useDeactivateFacebookPageMutation();
    const [setMiniAppEnabled, { isLoading: isTogglingMiniApp }] = useSetFacebookMiniAppEnabledMutation();

    const isConnected = data?.connected;
    const pageName = data?.pageName;
    const isActive = data?.active;
    const isToggling = isActivating || isDeactivating;

    async function handleToggle(next: boolean) {
        try {
            if (next) {
                await activatePage().unwrap();
            } else {
                await deactivatePage().unwrap();
            }
            toast({
                tone: "success",
                title: next ? "Messenger text/button bot is now active" : "Messenger text/button bot is now paused",
            });
        } catch (cause) {
            toast({
                tone: "error",
                title: "Could not toggle Messenger bot status",
                description: getApiErrorMessage(cause, "Please try again."),
            });
        }
    }

    async function handleMiniAppToggle(next: boolean) {
        try {
            await setMiniAppEnabled(next).unwrap();
            toast({
                tone: "success",
                title: next
                    ? "Mini App enabled — the persistent menu now opens your shop"
                    : "Mini App disabled",
            });
        } catch (cause) {
            toast({
                tone: "error",
                title: "Could not toggle Mini App",
                description: getApiErrorMessage(cause, "Please try again."),
            });
        }
    }

    useEffect(() => {
        const result = searchParams.get("facebook");
        if (result === "facebook_connected") {
            toast({
                tone: "success",
                title: "Facebook Page Connected!",
                description: "Your Facebook Page has been successfully linked for auto-reply & shop.",
            });
            router.replace("/business/facebook");
        } else if (result === "facebook_denied" || result === "facebook_connect_failed") {
            toast({
                tone: "error",
                title: "Connection Failed",
                description: "Could not connect your Facebook Page. Please try again.",
            });
            router.replace("/business/facebook");
        }
    }, [searchParams, toast, router]);

    async function handleConnect() {
        try {
            const res = await fetchConnectUrl().unwrap();
            if (res.url) {
                window.location.href = res.url;
            }
        } catch (cause) {
            toast({
                tone: "error",
                title: "Could not initiate Facebook connection",
                description: getApiErrorMessage(cause, "Please try again."),
            });
        }
    }

    async function handleDisconnect() {
        if (confirm("Are you sure you want to disconnect this Facebook Page?")) {
            try {
                await disconnectPage().unwrap();
                toast({
                    tone: "success",
                    title: "Facebook Page Disconnected",
                });
            } catch (cause) {
                toast({
                    tone: "error",
                    title: "Could not disconnect page",
                    description: getApiErrorMessage(cause, "Please try again."),
                });
            }
        }
    }

    if (isLoading) {
        return <FormSkeleton rows={2} />;
    }

    return (
        <div data-tour="facebook-connect-panel" className="flex flex-col gap-6">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex size-9.5 sm:size-11 md:size-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                            <svg className="size-5 sm:size-5.5 md:size-6 fill-current" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-foreground">
                                Facebook Messenger & Auto-Reply
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Connect your Facebook Page to auto-reply to customer messages, display product catalogs, and collect orders directly in Messenger.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isConnected ? (
                            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-3.5" />
                                Connected
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                <AlertCircle className="size-3.5" />
                                Not Connected
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 border-t border-border pt-6">
                    {isConnected ? (
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Linked Facebook Page
                                </p>
                                <p className="mt-1 text-lg font-bold text-foreground">
                                    {pageName ?? "Facebook Page"}
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="destructive"
                                disabled={isDisconnecting}
                                onClick={handleDisconnect}
                            >
                                {isDisconnecting ? (
                                    <LoaderCircle className="-ml-1 mr-2 size-4 animate-spin" />
                                ) : (
                                    <LogOut className="-ml-1 mr-2 size-4" />
                                )}
                                Disconnect Page
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-start gap-4">
                            <p className="text-sm text-muted-foreground">
                                Click below to authorize your Facebook Page via 1-Click Facebook OAuth.
                            </p>

                            <Button
                                type="button"
                                data-tour="facebook-connect-btn"
                                className="bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium"
                                disabled={isGettingUrl}
                                onClick={handleConnect}
                            >
                                {isGettingUrl ? (
                                    <LoaderCircle className="-ml-1 mr-2 size-4 animate-spin" />
                                ) : (
                                    <Link2 className="-ml-1 mr-2 size-4" />
                                )}
                                Connect Facebook Page
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            {isConnected && (
                <>
                    <section className="rounded-2xl border border-border bg-card p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-foreground">
                                    Enable Text/Button Bot
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Customers can browse your catalog, build a cart, and check out
                                    entirely through Messenger chat when this is on.
                                </p>
                            </div>

                            <Switch
                                checked={Boolean(isActive)}
                                disabled={isToggling}
                                onCheckedChange={handleToggle}
                                aria-label="Enable Messenger text/button bot"
                            />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-foreground">
                                    Mini App (Open Shop button)
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {data?.miniAppEnabled
                                        ? "Customers see an \"Open Shop\" button in Messenger that opens your full storefront as a real, graphical app."
                                        : "When on, the persistent menu opens your shop as a real, graphical app inside Messenger instead of the usual text/button chat."}
                                </p>
                                {data?.miniAppEnabled && data?.miniAppUrl && (
                                    <p className="mt-1 text-xs text-muted-foreground break-all">
                                        {data.miniAppUrl}
                                    </p>
                                )}
                            </div>

                            <Switch
                                checked={Boolean(data?.miniAppEnabled)}
                                disabled={isTogglingMiniApp}
                                onCheckedChange={handleMiniAppToggle}
                                aria-label="Enable Messenger Mini App"
                            />
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
