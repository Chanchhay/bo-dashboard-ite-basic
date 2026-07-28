import { baseApi } from "@/lib/baseApi";
import type {
    UserProfile,
    UserProfileInput,
} from "@/lib/api/user-profile";

export const userProfileApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getUserProfile: builder.query<UserProfile, void>({
            query: () => "/user-profile",
            providesTags: ["UserProfile"],
        }),
        updateUserProfile: builder.mutation<
            UserProfile,
            UserProfileInput
        >({
            query: (body) => ({
                url: "/user-profile",
                method: "PATCH",
                body,
            }),
            invalidatesTags: ["UserProfile"],
        }),
    }),
});

export const {
    useGetUserProfileQuery,
    useUpdateUserProfileMutation,
} = userProfileApi;
