import type { MembershipTypeResponse } from "./membership-type";
import type { SalesChannel } from "./sales-channels";
import type { PageResult } from "./pagination";

export type GlobalCustomerResponse = {
    id: string;
    keycloakUserId?: string;
    email?: string;
    fullName?: string;
    phoneNumber?: string;
};

export type CustomerResponse = {
    id: string;
    businessId: string;
    globalCustomer?: GlobalCustomerResponse;
    membershipType?: MembershipTypeResponse;
    salesChannel?: SalesChannel;
    address?: string;
    totalSpend?: number;
    becameMembershipAt?: string;
    active: boolean;
    createdDate?: string;
    lastModifiedDate?: string;
};

export type CustomerPage = PageResult<CustomerResponse>;

export type CreateCustomerInput = {
    fullName?: string;
    phoneNumber?: string;
    membershipTypeId?: string | null;
    salesChannelId?: string;
    totalSpend?: number;
    becameMembershipAt?: string;
    active?: boolean;
};

export type UpdateCustomerInput = {
    fullName?: string;
    phoneNumber?: string;
    membershipTypeId?: string | null;
    salesChannelId?: string;
    totalSpend?: number;
    becameMembershipAt?: string;
    active?: boolean;
};
