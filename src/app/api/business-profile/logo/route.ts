import { businessImageRoutes } from "@/lib/api/business-backend";
import { businessLogoRules } from "@/lib/api/business";

export const { POST, DELETE } = businessImageRoutes({
    segment: "logo",
    rules: businessLogoRules,
    missingMessage: "Choose a logo image to upload.",
});
