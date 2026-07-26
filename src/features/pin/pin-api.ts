import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

type LoginResponse = { cashierId: string; businessOwnerId: string };

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyPin(pin: string): Promise<LoginResponse> {
  await delay();
  if (pin !== "123456") {
    throw new Error("Invalid PIN");
  }
  return { cashierId: "cashier_1", businessOwnerId: "1" };


}

export const pinAuthApi = createApi({
  reducerPath: "pinAuthApi",
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    loginPin: builder.mutation<LoginResponse, string>({
      queryFn: async (pin) => {
        try {
          const data = await verifyPin(pin);
          return { data };
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),
  }),
});

export const { useLoginPinMutation } = pinAuthApi;