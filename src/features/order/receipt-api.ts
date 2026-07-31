// import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

// import { ReceiptDetail } from "@/types/pos-type";
// import { getReceiptDetail, getReceipts, GetReceiptsParams, GetReceiptsResult } from "../receipt";

// export const receiptApi = createApi({
//   reducerPath: "receiptApi",
//   baseQuery: fakeBaseQuery(),
//   tagTypes: ["Receipts"],
//   endpoints: (builder) => ({
//     getReceipts: builder.query<GetReceiptsResult, GetReceiptsParams | void>({
//       queryFn: async (params) => ({ data: await getReceipts(params ?? {}) }),
//       providesTags: ["Receipts"],
//     }),

//     getReceiptDetail: builder.query<ReceiptDetail, string>({
//       queryFn: async (id) => {
//         try {
//           const data = await getReceiptDetail(id);
//           return { data };
//         } catch (e) {
//           return { error: (e as Error).message };
//         }
//       },
//       providesTags: ["Receipts"],
//     }),
//   }),
// });

// export const { useGetReceiptsQuery, useGetReceiptDetailQuery } = receiptApi;


import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { ReceiptDetail } from "@/types/pos-type";
import { GetReceiptsParams, GetReceiptsResult } from "../receipt";
import { API_BASE_URL } from "@/lib/baseApi";

export const receiptApi = createApi({
  reducerPath: "receiptApi",
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ["Receipts"],
  endpoints: (builder) => ({
    getReceipts: builder.query<GetReceiptsResult, GetReceiptsParams | void>({
      query: (params) => ({ url: "receipts", params: params ?? {} }),
      providesTags: ["Receipts"],
    }),

    getReceiptDetail: builder.query<ReceiptDetail, string>({
      query: (id) => `receipts/${id}`,
      providesTags: ["Receipts"],
    }),
  }),
});

export const { useGetReceiptsQuery, useGetReceiptDetailQuery } = receiptApi;