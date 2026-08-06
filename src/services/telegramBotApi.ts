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
    }),
});

export const {
    useGetTelegramBotSettingQuery,
    useConnectTelegramBotMutation,
    useActivateTelegramBotMutation,
    useDeactivateTelegramBotMutation,
    useDisconnectTelegramBotMutation,
} = telegramBotApi;
