import { baseApi } from "@/lib/baseApi";

export type TelegramBotSetting = {
    id: string;
    businessId: string;
    botUsername: string | null;
    telegramBotId: number | null;
    welcomeMessage: string | null;
    botTokenConfigured: boolean;
    active: boolean;
    webhookUrl: string;
    notificationChatId: string | null;
    miniAppEnabled: boolean;
    /** Where the bot's menu button points when miniAppEnabled — null otherwise. */
    miniAppUrl: string | null;
};

export type TelegramBotSettingInput = {
    botToken: string;
    welcomeMessage?: string;
    notificationChatId?: string;
};

export const telegramBotApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getTelegramBotSetting: build.query<TelegramBotSetting, void>({
            query: () => "/businesses/social-settings/telegram-bot",
            providesTags: ["TelegramBot"],
        }),
        connectTelegramBot: build.mutation<TelegramBotSetting, TelegramBotSettingInput>({
            query: (body) => ({
                url: "/businesses/social-settings/telegram-bot",
                method: "PUT",
                body,
            }),
            invalidatesTags: ["TelegramBot"],
        }),
        activateTelegramBot: build.mutation<TelegramBotSetting, void>({
            query: () => ({
                url: "/businesses/social-settings/telegram-bot/activate",
                method: "PATCH",
            }),
            invalidatesTags: ["TelegramBot"],
        }),
        deactivateTelegramBot: build.mutation<TelegramBotSetting, void>({
            query: () => ({
                url: "/businesses/social-settings/telegram-bot/deactivate",
                method: "PATCH",
            }),
            invalidatesTags: ["TelegramBot"],
        }),
        disconnectTelegramBot: build.mutation<void, void>({
            query: () => ({
                url: "/businesses/social-settings/telegram-bot",
                method: "DELETE",
            }),
            invalidatesTags: ["TelegramBot"],
        }),
        setTelegramMiniAppEnabled: build.mutation<TelegramBotSetting, boolean>({
            query: (enabled) => ({
                url: `/businesses/social-settings/telegram-bot/mini-app?enabled=${enabled}`,
                method: "PATCH",
            }),
            invalidatesTags: ["TelegramBot"],
        }),
    }),
});

export const {
    useGetTelegramBotSettingQuery,
    useConnectTelegramBotMutation,
    useActivateTelegramBotMutation,
    useDeactivateTelegramBotMutation,
    useDisconnectTelegramBotMutation,
    useSetTelegramMiniAppEnabledMutation,
} = telegramBotApi;
