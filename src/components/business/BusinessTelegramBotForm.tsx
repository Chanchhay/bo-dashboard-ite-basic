"use client";

import { FormEvent, useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSkeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import {
    telegramBotApi,
    type TelegramBotSetting,
    type TelegramBotSettingInput,
} from "@/services/telegramBotApi";

export function BusinessTelegramBotForm() {
    const { toast } = useToast();
    const { data, isLoading } = telegramBotApi.useGetTelegramBotSettingQuery();
    const [connect, { isLoading: isConnecting }] = telegramBotApi.useConnectTelegramBotMutation();
    const [activate, { isLoading: isActivating }] = telegramBotApi.useActivateTelegramBotMutation();
    const [deactivate, { isLoading: isDeactivating }] = telegramBotApi.useDeactivateTelegramBotMutation();
    const [disconnect, { isLoading: isDisconnecting }] = telegramBotApi.useDisconnectTelegramBotMutation();
    const [setMiniAppEnabled, { isLoading: isTogglingMiniApp }] =
        telegramBotApi.useSetTelegramMiniAppEnabledMutation();

    const isToggling = isActivating || isDeactivating;
    const isConfigured = data?.botTokenConfigured;
    const isActive = data?.active;

    async function handleMiniAppToggle(next: boolean) {
        try {
            await setMiniAppEnabled(next).unwrap();
            toast({
                tone: "success",
                title: next
                    ? "Mini App enabled — the bot's menu button now opens your shop"
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

    async function handleToggle(next: boolean) {
        try {
            if (next) {
                await activate().unwrap();
            } else {
                await deactivate().unwrap();
            }
            toast({
                tone: "success",
                title: next ? "Telegram Bot is now active" : "Telegram Bot is now paused",
            });
        } catch (cause) {
            toast({
                tone: "error",
                title: "Could not toggle Telegram Bot status",
                description: getApiErrorMessage(cause, "Please try again."),
            });
        }
    }

    if (isLoading) {
        return <FormSkeleton rows={4} />;
    }

    return (
        <div data-tour="business-telegram-form" className="flex flex-col gap-6">
            <section data-tour="telegram-toggle" className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">
                            Enable Telegram Bot Integration
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {isConfigured
                                ? "Customers can order and pay via your bot when this is on."
                                : "Add your bot token below to turn this on."}
                        </p>
                    </div>

                    <Switch
                        checked={Boolean(isActive)}
                        disabled={!isConfigured || isToggling}
                        onCheckedChange={handleToggle}
                        aria-label="Enable Telegram Bot"
                    />
                </div>
            </section>

            <section data-tour="telegram-mini-app-toggle" className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">
                            Mini App (Open Shop button)
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {data?.miniAppEnabled
                                ? "Customers see an \"Open Shop\" button in the bot that opens your full storefront inside Telegram."
                                : "When on, the bot's menu button opens your shop as a real, graphical app inside Telegram instead of the usual text/button chat."}
                        </p>
                        {data?.miniAppEnabled && data?.miniAppUrl && (
                            <p className="mt-1 text-xs text-muted-foreground break-all">
                                {data.miniAppUrl}
                            </p>
                        )}
                    </div>

                    <Switch
                        checked={Boolean(data?.miniAppEnabled)}
                        disabled={!isConfigured || !isActive || isTogglingMiniApp}
                        onCheckedChange={handleMiniAppToggle}
                        aria-label="Enable Telegram Mini App"
                    />
                </div>
            </section>

            <AccountForm
                key={data?.id ?? "new"}
                settings={data}
                isSaving={isConnecting}
                onSave={async (input) => {
                    await connect(input).unwrap();
                    toast({ tone: "success", title: "Telegram settings saved" });
                }}
                onDisconnect={async () => {
                    await disconnect().unwrap();
                    toast({ tone: "success", title: "Telegram bot disconnected" });
                }}
                isDisconnecting={isDisconnecting}
            />
        </div>
    );
}

function AccountForm({
    settings,
    isSaving,
    onSave,
    onDisconnect,
    isDisconnecting,
}: {
    settings?: TelegramBotSetting | null;
    isSaving: boolean;
    onSave: (input: TelegramBotSettingInput) => Promise<void>;
    onDisconnect: () => Promise<void>;
    isDisconnecting: boolean;
}) {
    const { toast } = useToast();
    const [fields, setFields] = useState<Record<string, string>>({
        botToken: "", 
        welcomeMessage: settings?.welcomeMessage ?? "",
        notificationChatId: settings?.notificationChatId ?? "",
    });

    const isConfigured = settings?.botTokenConfigured;

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        
        if (!isConfigured && !fields.botToken.trim()) {
            toast({
                tone: "error",
                title: "Bot token is required for initial setup",
            });
            return;
        }

        try {
            await onSave({
                botToken: fields.botToken.trim(),
                welcomeMessage: fields.welcomeMessage.trim(),
                notificationChatId: fields.notificationChatId.trim(),
            });
            setFields(prev => ({ ...prev, botToken: "" }));
        } catch (cause) {
            toast({
                tone: "error",
                title: "Could not save settings",
                description: getApiErrorMessage(cause, "Check the bot token and try again."),
            });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
                    <h3 className="text-sm font-semibold text-foreground">
                        Bot Configuration
                    </h3>
                    {settings?.botUsername && (
                        <p className="text-sm font-medium text-muted-foreground">
                            @{settings.botUsername}
                        </p>
                    )}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div data-tour="telegram-token" className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="botToken">
                            {isConfigured ? "Update Bot Token" : "Bot Token"}
                        </Label>
                        <Input
                            id="botToken"
                            value={fields.botToken}
                            onChange={(e) =>
                                setFields({ ...fields, botToken: e.target.value })
                            }
                            required={!isConfigured}
                            placeholder={isConfigured ? "Leave blank to keep existing token" : "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"}
                        />
                        <p className="text-xs text-muted-foreground">
                            Create a bot via @BotFather on Telegram to get a token.
                        </p>
                    </div>

                    <div data-tour="telegram-chat-id" className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="notificationChatId">
                            Notification Chat ID (Optional)
                        </Label>
                        <Input
                            id="notificationChatId"
                            value={fields.notificationChatId}
                            onChange={(e) =>
                                setFields({ ...fields, notificationChatId: e.target.value })
                            }
                            placeholder="e.g. -100123456789"
                        />
                        <p className="text-xs text-muted-foreground">
                            Add the bot to your group and type <code>/getid</code> to find this. Payment alerts will be sent here.
                        </p>
                    </div>

                    <div data-tour="telegram-welcome" className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="welcomeMessage">
                            Welcome Message (Optional)
                        </Label>
                        <Textarea
                            id="welcomeMessage"
                            value={fields.welcomeMessage}
                            onChange={(e) =>
                                setFields({ ...fields, welcomeMessage: e.target.value })
                            }
                            placeholder="Welcome to our shop! How can we help you today?"
                        />
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
                    {isConfigured && (
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={isDisconnecting || isSaving}
                            onClick={async () => {
                                if (confirm("Are you sure you want to disconnect this bot?")) {
                                    try {
                                        await onDisconnect();
                                    } catch (cause) {
                                        toast({
                                            tone: "error",
                                            title: "Could not disconnect",
                                            description: getApiErrorMessage(cause, "Please try again."),
                                        });
                                    }
                                }
                            }}
                        >
                            Disconnect
                        </Button>
                    )}

                    <Button type="submit" data-tour="telegram-save" disabled={isSaving}>
                        {isSaving && (
                            <LoaderCircle
                                className="-ml-1 mr-2 size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {isConfigured ? "Update Settings" : "Connect Bot"}
                    </Button>
                </div>
            </section>
        </form>
    );
}
