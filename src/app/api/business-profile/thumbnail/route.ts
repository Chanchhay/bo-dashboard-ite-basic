import { businessImageRoutes } from "@/lib/api/business-backend";
import { businessThumbnailRules } from "@/lib/api/business";

export const { POST, DELETE } = businessImageRoutes({
    segment: "thumbnail",
    rules: businessThumbnailRules,
    missingMessage: "Choose a cover image to upload.",
});
