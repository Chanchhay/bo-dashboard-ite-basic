import { baseApi } from "@/lib/baseApi";
import type { RegisterSessionPage } from "@/lib/api/pos-session";

export const registerSessionApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getRegisterSessions: builder.query<
            RegisterSessionPage,
            { page?: number; size?: number } | void
        >({
            query: (args) => ({
                url: "/register/sessions",
                params: {
                    page: args?.page ?? 0,
                    size: args?.size ?? 20,
                },
            }),
            providesTags: ["RegisterSessions"],
        }),
    }),
});

export const { useGetRegisterSessionsQuery } = registerSessionApi;
