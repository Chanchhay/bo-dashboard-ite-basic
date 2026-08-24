import { baseApi } from "@/lib/baseApi";
import type {
  CreateCustomerInput,
  CustomerPage,
  CustomerResponse,
  UpdateCustomerInput,
} from "@/lib/api/customer";

export const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query<CustomerResponse[], void>({
      query: () => "/customers",
      transformResponse: (response: CustomerPage) => response.content ?? [],
      providesTags: ["Customers"],
    }),
    getCustomersPage: builder.query<
      CustomerPage,
      { page: number; size: number }
    >({
      query: (params) => ({ url: "/customers", params }),
      providesTags: (result) => [
        "Customers",
        ...(result?.content || []).map((customer) => ({
          type: "Customers" as const,
          id: customer.id,
        })),
      ],
    }),
    getCustomerById: builder.query<CustomerResponse, string>({
      query: (id) => `/customers/${id}`,
      providesTags: (_res, _err, id) => [{ type: "Customers", id }],
    }),
    createCustomer: builder.mutation<CustomerResponse, CreateCustomerInput>({
      query: (body) => ({
        url: "/customers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Customers"],
    }),
    updateCustomer: builder.mutation<
      CustomerResponse,
      { id: string; body: UpdateCustomerInput }
    >({
      query: ({ id, body }) => ({
        url: `/customers/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Customers"],
    }),
    activateCustomer: builder.mutation<CustomerResponse, string>({
      query: (id) => ({
        url: `/customers/${id}/activate`,
        method: "PATCH",
      }),
      invalidatesTags: ["Customers"],
    }),
    deactivateCustomer: builder.mutation<CustomerResponse, string>({
      query: (id) => ({
        url: `/customers/${id}/deactivate`,
        method: "PATCH",
      }),
      invalidatesTags: ["Customers"],
    }),
    deleteCustomer: builder.mutation<void, string>({
      query: (id) => ({
        url: `/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customers"],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomersPageQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useActivateCustomerMutation,
  useDeactivateCustomerMutation,
  useDeleteCustomerMutation,
} = customerApi;
