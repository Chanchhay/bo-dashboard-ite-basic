// import { Order, Product, PaymentInput, OrderListItem } from "@/types/pos-type";
// import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
// import {
//   getProducts,
//   getCurrentOrder,
//   getOpenOrders,
//   loadOrderForEdit,
//   updateOrderItemQty,
//   removeOrderItem,
//   addProductToOrder,
//   renameOrder,
//   payOrder,
// } from "../order";

// export const orderApi = createApi({
//   reducerPath: "orderApi",
//   baseQuery: fakeBaseQuery(),
//   tagTypes: ["Order", "Products"],
//   endpoints: (builder) => ({
//     getProducts: builder.query<Product[], void>({
//       queryFn: async () => ({ data: await getProducts() }),
//       providesTags: ["Products"],
//     }),

//     getCurrentOrder: builder.query<Order, void>({
//       queryFn: async () => ({ data: await getCurrentOrder() }),
//       providesTags: ["Order"],
//     }),

//     getOpenOrders: builder.query<OrderListItem[], void>({
//       queryFn: async () => ({ data: await getOpenOrders() }),
//       providesTags: ["Order"],
//     }),

//     loadOrderForEdit: builder.mutation<Order, string>({
//       queryFn: async (orderId) => {
//         try {
//           const data = await loadOrderForEdit(orderId);
//           return { data };
//         } catch (e) {
//           return { error: (e as Error).message };
//         }
//       },
//       invalidatesTags: ["Order"],
//     }),

//     updateItemQty: builder.mutation<Order, { itemId: string; delta: number }>({
//       queryFn: async ({ itemId, delta }) => ({
//         data: await updateOrderItemQty(itemId, delta),
//       }),
//       async onQueryStarted({ itemId, delta }, { dispatch, queryFulfilled }) {
//         const patch = dispatch(
//           orderApi.util.updateQueryData("getCurrentOrder", undefined, (draft) => {
//             const item = draft.items.find((i) => i.id === itemId);
//             if (item) item.quantity = Math.max(1, item.quantity + delta);
//           })
//         );
//         try {
//           await queryFulfilled;
//         } catch {
//           patch.undo();
//         }
//       },
//       invalidatesTags: ["Order"],
//     }),

//     removeItem: builder.mutation<Order, string>({
//       queryFn: async (itemId) => ({ data: await removeOrderItem(itemId) }),
//       async onQueryStarted(itemId, { dispatch, queryFulfilled }) {
//         const patch = dispatch(
//           orderApi.util.updateQueryData("getCurrentOrder", undefined, (draft) => {
//             draft.items = draft.items.filter((i) => i.id !== itemId);
//           })
//         );
//         try {
//           await queryFulfilled;
//         } catch {
//           patch.undo();
//         }
//       },
//       invalidatesTags: ["Order"],
//     }),

//     addProduct: builder.mutation<Order, string>({
//       queryFn: async (productId) => {
//         try {
//           const data = await addProductToOrder(productId);
//           return { data };
//         } catch (e) {
//           return { error: (e as Error).message };
//         }
//       },
//       invalidatesTags: ["Order"],
//     }),

//     renameOrder: builder.mutation<Order, string>({
//       queryFn: async (note) => ({ data: await renameOrder(note) }),
//       invalidatesTags: ["Order"],
//     }),

//     pay: builder.mutation<Order, PaymentInput>({
//       queryFn: async (input) => {
//         try {
//           const data = await payOrder(input);
//           return { data };
//         } catch (e) {
//           return { error: (e as Error).message };
//         }
//       },
//       invalidatesTags: ["Order"],
//     }),
//   }),
// });

// export const {
//   useGetProductsQuery,
//   useGetCurrentOrderQuery,
//   useGetOpenOrdersQuery,
//   useLoadOrderForEditMutation,
//   useUpdateItemQtyMutation,
//   useRemoveItemMutation,
//   useAddProductMutation,
//   useRenameOrderMutation,
//   usePayMutation,
// } = orderApi;

import { API_BASE_URL } from "@/lib/baseApi";
import { Order, Product, PaymentInput, OrderListItem } from "@/types/pos-type";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ["Order", "Products"],
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      query: () => "products",
      providesTags: ["Products"],
    }),

    getCurrentOrder: builder.query<Order, void>({
      query: () => "orders/current",
      providesTags: ["Order"],
    }),

    getOpenOrders: builder.query<OrderListItem[], void>({
      query: () => "orders/open",
      providesTags: ["Order"],
    }),

    loadOrderForEdit: builder.mutation<Order, string>({
      query: (orderId) => ({ url: `orders/${orderId}/edit`, method: "POST" }),
      invalidatesTags: ["Order"],
    }),

    updateItemQty: builder.mutation<Order, { itemId: string; delta: number }>({
      query: ({ itemId, delta }) => ({
        url: `order-items/${itemId}/qty`,
        method: "PATCH",
        body: { delta },
      }),
      async onQueryStarted({ itemId, delta }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          orderApi.util.updateQueryData(
            "getCurrentOrder",
            undefined,
            (draft) => {
              const item = draft.items.find((i) => i.id === itemId);
              if (item) item.quantity = Math.max(1, item.quantity + delta);
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["Order"],
    }),

    removeItem: builder.mutation<Order, string>({
      query: (itemId) => ({ url: `order-items/${itemId}`, method: "DELETE" }),
      async onQueryStarted(itemId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          orderApi.util.updateQueryData(
            "getCurrentOrder",
            undefined,
            (draft) => {
              draft.items = draft.items.filter((i) => i.id !== itemId);
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["Order"],
    }),

    addProduct: builder.mutation<Order, string>({
      query: (productId) => ({
        url: `orders/current/items`,
        method: "POST",
        body: { productId },
      }),
      invalidatesTags: ["Order"],
    }),

    renameOrder: builder.mutation<Order, { name: string; comment?: string }>({
      query: ({ name, comment }) => ({
        url: `orders/current/rename`,
        method: "PATCH",
        body: { note: name, comment },
      }),
      invalidatesTags: ["Order"],
    }),

    pay: builder.mutation<Order, PaymentInput>({
      query: (input) => ({
        url: `orders/current/pay`,
        method: "POST",
        body: input,
      }),
      invalidatesTags: ["Order"],
    }),

    clearOrder: builder.mutation<Order, void>({
      query: () => ({ url: `orders/current/clear`, method: "POST" }),
      invalidatesTags: ["Order"],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetCurrentOrderQuery,
  useGetOpenOrdersQuery,
  useLoadOrderForEditMutation,
  useUpdateItemQtyMutation,
  useRemoveItemMutation,
  useAddProductMutation,
  useRenameOrderMutation,
  usePayMutation,
  useClearOrderMutation,
} = orderApi;
