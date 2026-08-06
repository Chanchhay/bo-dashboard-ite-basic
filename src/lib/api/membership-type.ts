import type { DiscountSummaryResponse, RecordStatus } from "./discount";

export type MembershipTypeResponse = {
    id: string;
    businessOwnerId: string;
    typeName: string;
    remark?: string;
    discountId?: string;
    discount?: DiscountSummaryResponse;
    status: RecordStatus;
    createdBy?: string;
};

export type CreateMembershipTypeInput = {
    typeName: string;
    remark?: string;
    discountId?: string;
    status?: RecordStatus;
};

export type UpdateMembershipTypeInput = {
    typeName?: string;
    remark?: string;
    discountId?: string;
    status?: string;
};
