import { baseApi } from "@/lib/baseApi";
import type { RegisterSessionPage } from "@/lib/api/pos-session";

export const registerSessionApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /**
         * One page of the register session history, newest first.
         *
         * Keyed on the page and size so stepping back to a page already read
         * answers from cache, and invalidated as a whole when a drawer opens
         * or closes — a new session changes which sessions land on which page,
         * so no single page can be patched in isolation.
         */
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
