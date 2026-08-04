export const dummyMutation = (): [any, any] => [
  async (args?: any) => ({ unwrap: async () => ({}) }),
  { isLoading: false, isError: false, error: null }
];

export const dummyQuery = (): any => ({
  data: [],
  isLoading: false,
  isFetching: false,
  error: null
});

export const dummyLazyQuery = (): [any, any] => [
  async (args?: any) => ({ data: null, unwrap: async () => ({}) }),
  { data: [], isFetching: false, isLoading: false, error: null }
];

export const useAddCashMovementMutation = dummyMutation;
export const useCancelPosOrderMutation = dummyMutation;
export const useCreateCustomerMutation = dummyMutation;
export const useCreatePosOrderMutation = dummyMutation;
export const useGenerateKhqrMutation = dummyMutation;
export const useGetCurrentSessionQuery = dummyQuery;
export const useGetOrderReceiptQuery = dummyQuery;
export const useGetPaymentStatusQuery = dummyQuery;
export const useGetPosCatalogQuery = dummyQuery;
export const useGetPosCurrenciesQuery = dummyQuery;
export const useGetPosDiscountsQuery = dummyQuery;
export const useGetPosOrdersQuery = dummyQuery;
export const useGetPosStockQuery = dummyQuery;
export const useGetSalesQuery = dummyQuery;
export const useLazyFindPosItemByBarcodeQuery = dummyLazyQuery;
export const useLazyGetPosOrderQuery = dummyLazyQuery;
export const useLazySearchCustomersQuery = dummyLazyQuery;
export const useMarkReceiptPrintedMutation = dummyMutation;
export const usePayPosOrderMutation = dummyMutation;
export const useQuoteOrderMutation = dummyMutation;
export const useUpdatePosOrderMutation = dummyMutation;

export const posApi = {
    reducerPath: 'posApi',
    reducer: () => ({}),
    middleware: () => (next: any) => (action: any) => next(action),
};
