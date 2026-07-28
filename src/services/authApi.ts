// Need to use the React-specific entry point to import createApi
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: fetchBaseQuery({ baseUrl: "https://pokeapi.co/api/v2/" }),
    endpoints: (builder) => ({
        login: builder.mutation<string, string>({
            query: (name) => `pokemon/${name}`,
        }),
    }),
});

export const { useLoginMutation } = authApi;
