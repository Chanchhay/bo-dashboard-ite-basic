import { baseApi } from "@/lib/baseApi";
import type { CustomerDisplayPayload } from "@/types/customer-display";

export interface PublishCustomerDisplayInput {
  businessId: string;
  terminalId: string;
  payload: CustomerDisplayPayload;
}

export const customerDisplayApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    publishCustomerDisplay: builder.mutation<void, PublishCustomerDisplayInput>({
      query: ({ businessId, terminalId, payload }) => ({
        url: `/businesses/${businessId}/customer-display/${terminalId}/publish`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["CustomerDisplay"],
    }),
  }),
});

export const { usePublishCustomerDisplayMutation } = customerDisplayApi;
