import { z } from "zod";

export const notificationSchema = z.object({
    id: z.string(),
    notificationId: z.string().optional().nullable(),
    senderId: z.string().optional().nullable(),
    senderName: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    title: z.string().optional().default("Notification"),
    content: z.string().optional().default(""),
    deepLink: z.string().optional().nullable(),
    read: z.boolean().optional().default(false),
    readAt: z.string().optional().nullable(),
    deliveredAt: z.string().optional().nullable(),
    createdAt: z.string().optional().nullable(),
});

export const notificationResponseSchema = z.object({
    content: z.array(notificationSchema),
    page: z.object({
        size: z.number().optional().default(0),
        number: z.number().optional().default(0),
        totalElements: z.number().optional().default(0),
        totalPages: z.number().optional().default(0),
    }).optional().default({ size: 0, number: 0, totalElements: 0, totalPages: 0 }),
});

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationResponse = z.infer<
    typeof notificationResponseSchema
>;

export function normalizeNotificationResponse(
    input: unknown,
): NotificationResponse {
    return notificationResponseSchema.parse(input);
}