import { baseApi } from "@/lib/baseApi";
import {
    toUserProfileFormData,
    type UserProfile,
    type UserProfileUpdate,
} from "@/lib/api/user-profile";

// The update answers with the full `UserProfileResponse`, so the form writes
// that answer straight into the `getUserProfile` cache with
// `userProfileApi.util.upsertQueryData`. Everything reading the profile — the
// form, the account menu — updates in the same tick, with no refetch in
// between, which is why the mutation does not invalidate `UserProfile`.
export const userProfileApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getUserProfile: builder.query<UserProfile, void>({
            query: () => "/user-profile",
            providesTags: ["UserProfile"],
        }),
        updateUserProfile: builder.mutation<
            UserProfile,
            UserProfileUpdate
        >({
            query: ({ file, ...fields }) => ({
                url: "/user-profile",
                method: "PATCH",
                body: toUserProfileFormData(fields, file),
            }),
        }),
    }),
});

export const {
    useGetUserProfileQuery,
    useUpdateUserProfileMutation,
} = userProfileApi;
