import { baseApi } from "@/lib/baseApi";
import {
    toUserProfileFormData,
    type UserProfile,
    type UserProfileUpdate,
} from "@/lib/api/user-profile";

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
            query: ({ file, ...fields }) => {
                if (file) {
                    return {
                        url: "/user-profile",
                        method: "PATCH",
                        body: toUserProfileFormData(fields, file),
                    };
                }

                return {
                    url: "/user-profile",
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: fields,
                };
            },
        }),
        deleteProfilePicture: builder.mutation<void, void>({
            query: () => ({
                url: "/user-profile/picture",
                method: "DELETE",
            }),
        }),
        notifyStaffLogin: builder.mutation<void, void>({
            query: () => ({
                url: "/user-profile/login-notify",
                method: "POST",
            }),
        }),
    }),
});

export const {
    useGetUserProfileQuery,
    useUpdateUserProfileMutation,
    useDeleteProfilePictureMutation,
    useNotifyStaffLoginMutation,
} = userProfileApi;
