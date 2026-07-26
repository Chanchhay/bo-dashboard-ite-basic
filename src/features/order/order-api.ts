import { Order, Product } from "@/types/pos-type";
import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  getProducts,
  getCurrentOrder,
  updateOrderItemQty,
  removeOrderItem,
  addProductToOrder,
  payOrder,
} from "../order";

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: fakeBaseQuery(), 
  tagTypes: ["Order", "Products"],
  endpoints: (builder) => ({

      getProducts: builder.query<Product[], void>({
      queryFn: async () => ({ data: await getProducts() }),
      providesTags: ["Products"],
    }),
 

    getCurrentOrder: builder.query<Order, void>({
      queryFn: async () => ({ data: await getCurrentOrder() }),
      providesTags: ["Order"],
    }),

    updateItemQty: builder.mutation<Order, { itemId: string; delta: number }>({
      queryFn: async ({ itemId, delta }) => ({
        data: await updateOrderItemQty(itemId, delta),
      }),
      //update: patch the cached order
      async onQueryStarted({ itemId, delta }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          orderApi.util.updateQueryData("getCurrentOrder", undefined, (draft) => {
            const item = draft.items.find((i) => i.id === itemId);
            if (item) item.quantity = Math.max(1, item.quantity + delta);
          })
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
      queryFn: async (itemId) => ({ data: await removeOrderItem(itemId) }),
      async onQueryStarted(itemId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          orderApi.util.updateQueryData("getCurrentOrder", undefined, (draft) => {
            draft.items = draft.items.filter((i) => i.id !== itemId);
          })
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
      queryFn: async (productId) => ({ data: await addProductToOrder(productId) }),
      invalidatesTags: ["Order"],
    }),

    pay: builder.mutation<Order, void>({
      queryFn: async () => ({ data: await payOrder() }),
      invalidatesTags: ["Order"],
    }),
  }),
});

export const {
  useGetCurrentOrderQuery,
  useUpdateItemQtyMutation,
  useRemoveItemMutation,
  useAddProductMutation,
  usePayMutation,
  useGetProductsQuery
} = orderApi;