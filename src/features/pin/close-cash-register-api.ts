// import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

// type OpenRegisterInput = {
//   businessOwnerId: string;
//   cashierId: string;
//   startingCash: number;
//   notes?: string;
// };

// type OpenRegisterResponse = { registerSessionId: string };

// export type RegisterSession = {
//   registerSessionId: string;
//   cashierName: string;
//   openedAt: string; // e.g. "24/07/2026 - 08:12"
//   openingAmount: number;
//   revenue: number;
//   orderCount: number;
// };

// type CloseRegisterInput = {
//   registerSessionId: string;
//   totalCounted: number;
// };

// type CloseRegisterResponse = {
//   totalExpected: number;
//   totalDifferent: number;
// };

// const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// // ---- MOCK ACTIVE SESSION (stand-in for a real `register_sessions` row) ----
// const mockSession: RegisterSession = {
//   registerSessionId: "register_session_1",
//   cashierName: "Sophea Chan",
//   openedAt: "24/07/2026 - 08:12",
//   openingAmount: 200.0,
//   revenue: 1340.5,
//   orderCount: 47,
// };

// async function openRegisterMock(
//   input: OpenRegisterInput
// ): Promise<OpenRegisterResponse> {
//   await delay();
//   if (input.startingCash < 0) {
//     throw new Error("Starting cash cannot be negative");
//   }
//   return { registerSessionId: "register_session_1" };


// }

// async function getRegisterSessionMock(): Promise<RegisterSession> {
//   await delay();
//   return { ...mockSession };
// }

// async function closeRegisterMock(
//   input: CloseRegisterInput
// ): Promise<CloseRegisterResponse> {
//   await delay();
//   const totalExpected = mockSession.openingAmount + mockSession.revenue;
//   const totalDifferent = input.totalCounted - totalExpected;
//   return { totalExpected, totalDifferent };

// }

// export const closeRegisterApi = createApi({
//   reducerPath: "closeRegisterApi",
//   baseQuery: fakeBaseQuery(),
//   tagTypes: ["RegisterSession"],
//   endpoints: (builder) => ({
//     openRegister: builder.mutation<OpenRegisterResponse, OpenRegisterInput>({
//       queryFn: async (input) => {
  
//           const data = await openRegisterMock(input);
//           return { data };
     
//       },
//       invalidatesTags: ["RegisterSession"],
//     }),

//     getRegisterSession: builder.query<RegisterSession, void>({
//       queryFn: async () => ({ data: await getRegisterSessionMock() }),
//       providesTags: ["RegisterSession"],
//     }),
//     closeRegister: builder.mutation<CloseRegisterResponse, CloseRegisterInput>({
//       queryFn: async (input) => {
//           const data = await closeRegisterMock(input);
//           return { data };
//       },
//       invalidatesTags: ["RegisterSession"],
//     }),
//   }),
// });

// export const {
//   useOpenRegisterMutation,
//   useGetRegisterSessionQuery,
//   useCloseRegisterMutation,
// } = closeRegisterApi;



import { API_BASE_URL } from "@/lib/baseApi";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";


type OpenRegisterInput = {
  businessOwnerId: string;
  cashierId: string;
  startingCash: number;
  notes?: string;
};
type OpenRegisterResponse = { registerSessionId: string };

export type RegisterSession = {
  registerSessionId: string;
  cashierName: string;
  openedAt: string;
  openingAmount: number;
  revenue: number;
  orderCount: number;
};

type CloseRegisterInput = { registerSessionId: string; totalCounted: number };
type CloseRegisterResponse = { totalExpected: number; totalDifferent: number };

export const closeRegisterApi = createApi({
  reducerPath: "closeRegisterApi",
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ["RegisterSession"],
  endpoints: (builder) => ({
    openRegister: builder.mutation<OpenRegisterResponse, OpenRegisterInput>({
      query: (input) => ({ url: "register/open", method: "POST", body: input }),
      invalidatesTags: ["RegisterSession"],
    }),
    getRegisterSession: builder.query<RegisterSession, void>({
      query: () => "register/session",
      providesTags: ["RegisterSession"],
    }),
    closeRegister: builder.mutation<CloseRegisterResponse, CloseRegisterInput>({
      query: (input) => ({ url: "register/close", method: "POST", body: input }),
      invalidatesTags: ["RegisterSession"],
    }),
  }),
});

export const {
  useOpenRegisterMutation,
  useGetRegisterSessionQuery,
  useCloseRegisterMutation,
} = closeRegisterApi;