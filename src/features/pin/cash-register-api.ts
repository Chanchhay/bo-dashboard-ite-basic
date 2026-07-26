import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

type OpenRegisterInput = {
  businessOwnerId: string;
  cashierId: string;
  startingCash: number;
  notes?: string;
};

type OpenRegisterResponse = { registerSessionId: string };

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

async function openRegisterMock(
  input: OpenRegisterInput
): Promise<OpenRegisterResponse> {
  await delay();
  if (input.startingCash < 0) {
    throw new Error("Starting cash cannot be negative");
  }
  return { registerSessionId: "register_session_1" };

}

export const cashRegisterApi = createApi({
  reducerPath: "registerApi",
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    openRegister: builder.mutation<OpenRegisterResponse, OpenRegisterInput>({
      queryFn: async (input) => {
        try {
          const data = await openRegisterMock(input);
          return { data };
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),
  }),
});

export const { useOpenRegisterMutation } = cashRegisterApi;