"use client";

import {
    useRef,
    useState,
    type FocusEvent,
    type FormEvent,
    type ReactNode,
} from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Camera, Image as ImageIcon } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import type { LocationValue } from "@/components/business/LocationMapPicker";
import {
    controlClassName,
    textareaClassName as sharedTextareaClassName,
} from "@/components/ui/form-controls";
import {
    ImagePicker,
    useStagedImage,
} from "@/components/ui/image-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
    businessLogoRules,
    businessProfileSchema,
    businessThumbnailRules,
    facebookPageUrl,
    type Business,
    type BusinessCategory,
    type BusinessProfileInput,
    type BusinessSubCategory,
} from "@/lib/api/business";
import { hasApiErrorMessage } from "@/lib/api-error";
import type { ImageUploadRules } from "@/lib/api/image-upload";
import {
    businessApi,
    useDeleteBusinessLogoMutation,
    useDeleteBusinessThumbnailMutation,
    useGetBusinessCategoriesQuery,
    useGetBusinessProfileQuery,
    useUpdateBusinessProfileMutation,
    useUploadBusinessLogoMutation,
    useUploadBusinessThumbnailMutation,
} from "@/services/businessApi";
import { useAppDispatch } from "@/store/hooks";


const LocationMapPicker = dynamic(
    () =>
        import("@/components/business/LocationMapPicker").then(
            (mod) => mod.LocationMapPicker,
        ),
    {
        ssr: false,
        loading: () => (
            <div className="h-72 w-full animate-pulse rounded-xl bg-muted" />
        ),
    },
);

const asset = (name: string) => `/business-profile-assets/${name}`;

type FieldName = keyof BusinessProfileInput;
type FieldErrors = Partial<Record<FieldName, string>>;

type FieldProps = {
    label: string;
    name: FieldName;
    error?: string;
    children: ReactNode;
};

function Field({ label, name, error, children }: FieldProps) {
    return (
        <div className="flex min-w-0 flex-col gap-2.5">
            <Label
                htmlFor={name}
                className="pl-1 text-base leading-[16.5px] font-semibold text-[#424841] dark:text-[#cbd5e1]"
            >
                {label}
            </Label>
            {children}
            {error ? (
                <p className="pl-1 text-xs text-danger" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function SectionTitle({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <h2 className="pl-1 text-base leading-6 font-bold text-[#020409] dark:text-[#f8fafc] uppercase">
                {children}
            </h2>
            <span className="h-0.5 w-8 bg-primary/30" />
        </div>
    );
}

function getApiErrorMessage(error: unknown, fallback: string) {
    if (
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "message" in error.data &&
        typeof error.data.message === "string"
    ) {
        return error.data.message;
    }

    return fallback;
}

function getFieldErrors(
    error: z.ZodError<BusinessProfileInput>,
): FieldErrors {
    const flattened = z.flattenError(error).fieldErrors;
    const fieldErrors: FieldErrors = {};

    for (const [name, messages] of Object.entries(flattened)) {
        const message = messages?.[0];

        if (message) {
            fieldErrors[name as FieldName] = message;
        }
    }

    return fieldErrors;
}

function getBusinessTypes(
    business: Business,
    categories: BusinessCategory[] | undefined,
) {
    const businessTypes = (categories || [])
        .flatMap((category) => category.subCategories || [])
        .filter(
            (
                businessType,
            ): businessType is BusinessSubCategory & {
                id: string;
                name: string;
            } => Boolean(businessType.id && businessType.name),
        );
    const currentBusinessType = business.category;

    if (
        currentBusinessType?.id &&
        currentBusinessType.name &&
        !businessTypes.some(
            (businessType) => businessType.id === currentBusinessType.id,
        )
    ) {
        businessTypes.unshift({
            ...currentBusinessType,
            id: currentBusinessType.id,
            name: currentBusinessType.name,
        });
    }

    return businessTypes;
}

const inputClassName = controlClassName;
const textareaClassName = sharedTextareaClassName;

function StagedImageField({
    staged,
    rules,
    disabled,
    label,
    noun,
    preview,
    previewShape,
}: {
    staged: ReturnType<typeof useStagedImage>;
    rules: ImageUploadRules;
    disabled: boolean;
    label: string;
    noun: string;
    preview: ReactNode;
    previewShape?: "circle" | "rect";
}) {
    const { toast } = useToast();

    return (
        <ImagePicker
            rules={rules}
            disabled={disabled}
            previewShape={previewShape}
            label={label}
            preview={preview}
            onPick={staged.pick}
            onError={(message) => {
                toast({
                    tone: "error",
                    title: `${noun} not selected`,
                    description: message,
                });
            }}
            actions={
                <div className="flex flex-col items-center gap-1.5 py-1">
                    {staged.file ? (
                        <p className="text-center text-[11px] leading-4 text-[#6b7280] dark:text-[#94a3b8]">
                            {staged.file.name} — uploads when you save.
                        </p>
                    ) : null}
                    {staged.removed ? (
                        <p className="text-center text-[11px] leading-4 text-[#6b7280] dark:text-[#94a3b8]">
                            {noun} removed — applies when you save.
                        </p>
                    ) : null}
                    {staged.preview || staged.isDirty ? (
                        <Button
                            type="button"
                            variant="link"
                            size="xs"
                            disabled={disabled}
                            onClick={
                                staged.isDirty ? staged.reset : staged.remove
                            }
                            className={`h-auto px-2 py-1 text-xs font-medium ${staged.isDirty
                                ? "text-[#4b5563] dark:text-[#94a3b8] hover:text-primary"
                                : "text-danger hover:text-danger"
                                }`}
                        >
                            {staged.isDirty
                                ? `Undo ${noun.toLowerCase()} change`
                                : `Remove ${noun.toLowerCase()}`}
                        </Button>
                    ) : null}
                </div>
            }
        />
    );
}

function BusinessProfileEditor({
    business,
    businessTypes,
}: {
    business: Business;
    businessTypes: BusinessSubCategory[];
}) {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const [updateBusinessProfile, { isLoading: isSaving }] =
        useUpdateBusinessProfileMutation();
    const [uploadBusinessLogo, { isLoading: isUploadingLogo }] =
        useUploadBusinessLogoMutation();
    const [deleteBusinessLogo, { isLoading: isDeletingLogo }] =
        useDeleteBusinessLogoMutation();
    const [uploadBusinessThumbnail, { isLoading: isUploadingThumbnail }] =
        useUploadBusinessThumbnailMutation();
    const [deleteBusinessThumbnail, { isLoading: isDeletingThumbnail }] =
        useDeleteBusinessThumbnailMutation();
    const isLoading =
        isSaving ||
        isUploadingLogo ||
        isDeletingLogo ||
        isUploadingThumbnail ||
        isDeletingThumbnail;
    const formRef = useRef<HTMLFormElement>(null);
    const logo = useStagedImage(businessLogoRules, business.logo || "");
    const thumbnail = useStagedImage(
        businessThumbnailRules,
        business.thumbnail || "",
    );
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const [locationResetKey, setLocationResetKey] = useState(0);
 
    const [locationOverride, setLocationOverride] = useState<LocationValue | null>(
        null,
    );
    const [isLinkingLocation, setIsLinkingLocation] = useState(false);
 
    const lastDetectedLinkRef = useRef<string | null>(business.googleMap || null);

    const [detectedAddress, setDetectedAddress] = useState<string | null>(null);

    function handleCancel() {
        formRef.current?.reset();
        logo.reset();
        thumbnail.reset();
        setFieldErrors({});
        setLocationOverride(null);
        setDetectedAddress(null);
        setLocationResetKey((key) => key + 1);
    }

 
    async function autoDetectLocationFromLink(
        event: FocusEvent<HTMLInputElement>,
    ) {
        const link = event.currentTarget.value.trim();
        if (!link || link === lastDetectedLinkRef.current) {
            return;
        }
        lastDetectedLinkRef.current = link;

        setIsLinkingLocation(true);
        try {
            const response = await fetch(
                `/api/geocode/from-link?url=${encodeURIComponent(link)}`,
            );
            const data = await response.json();

            if (!response.ok) {
                toast({
                    tone: "error",
                    title: "Couldn't read that Google Maps link",
                    description:
                        getApiErrorMessage(
                            { data },
                            "Search or drag the pin on the map below instead.",
                        ),
                });
                return;
            }

            setLocationOverride({
                lat: data.lat,
                lng: data.lon,
                provinceName: data.address?.provinceName ?? "",
                districtName: data.address?.districtName ?? "",
                communeName: data.address?.communeName ?? "",
            });
            setLocationResetKey((key) => key + 1);
            if (data.label) {
               
                setDetectedAddress((data.label as string).slice(0, 255));
            }
            toast({
                tone: "success",
                title: "Location found",
                description:
                    "Check the pin on the map below, and the Address/Province/District/Commune fields, and adjust anything that's off.",
            });
        } catch {
            toast({
                tone: "error",
                title: "Couldn't read that link",
                description: "Check your connection and try again.",
            });
        } finally {
            setIsLinkingLocation(false);
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const result = businessProfileSchema.safeParse({
            name: String(formData.get("name") || ""),
            categoryId: String(formData.get("categoryId") || ""),
            about: String(formData.get("about") || ""),
            email: String(formData.get("email") || ""),
            website: String(formData.get("website") || ""),
            phoneNumber: String(formData.get("phoneNumber") || ""),
            address: String(formData.get("address") || ""),
            googleMap: String(formData.get("googleMap") || ""),
            facebookPage: String(formData.get("facebookPage") || ""),
            provinceName: String(formData.get("provinceName") || ""),
            districtName: String(formData.get("districtName") || ""),
            communeName: String(formData.get("communeName") || ""),
            latitude: String(formData.get("latitude") || ""),
            longitude: String(formData.get("longitude") || ""),
            openTime: String(formData.get("openTime") || ""),
            closeTime: String(formData.get("closeTime") || ""),
            isClosed: formData.get("isClosed") === "true",
        });

        if (!result.success) {
            setFieldErrors(getFieldErrors(result.error));
            toast({
                tone: "error",
                title: "Business profile not saved",
                description: "Check the highlighted fields and try again.",
            });
            return;
        }

        setFieldErrors({});

        let imageChanged = false;

        try {
            if (logo.file) {
                await uploadBusinessLogo(logo.file).unwrap();
                imageChanged = true;
            } else if (logo.removed) {
                await deleteBusinessLogo().unwrap();
                imageChanged = true;
            }

            if (thumbnail.file) {
                await uploadBusinessThumbnail(thumbnail.file).unwrap();
                imageChanged = true;
            } else if (thumbnail.removed) {
                await deleteBusinessThumbnail().unwrap();
                imageChanged = true;
            }

            await updateBusinessProfile(result.data).unwrap();
            logo.reset();
            thumbnail.reset();
            toast({
                tone: "success",
                title: "Business profile saved",
                description: "Your business information is up to date.",
            });
        } catch (error) {
            if (imageChanged) {
                dispatch(businessApi.util.invalidateTags(["Business"]));
            }

            toast({
                tone: "error",
                title: "Business profile not saved",
                description: getApiErrorMessage(
                    error,
                    "Unable to save the business profile.",
                ),
            });
        }
    }

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            data-tour="business-profile-form"
            className="flex min-h-0 flex-col gap-4 sm:gap-5 rounded-xl bg-white dark:bg-[#1a1e29] border border-transparent dark:border-[#242937] p-4 sm:p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
        >
            <div className="grid gap-6 xl:gap-[30px] xl:grid-cols-[303px_minmax(0,1fr)]">
                <div className="flex flex-col gap-4" data-tour="profile-logo">
                    <StagedImageField
                        staged={logo}
                        rules={businessLogoRules}
                        disabled={isLoading}
                        label="Business Logo"
                        noun="Logo"
                        previewShape="circle"
                        preview={
                            <span className="flex size-24 sm:size-32 items-center justify-center overflow-hidden rounded-full bg-[#e8e8e8] dark:bg-[#252a38]">
                                {logo.preview ? (

                                    <Image
                                        src={logo.preview}
                                        alt="Business logo preview"
                                        className="size-full object-cover"
                                        width={128}
                                        height={128}
                                    />
                                ) : (
                                    <Camera className="size-7 sm:size-9 text-primary" />
                                )}
                            </span>
                        }
                    />
                </div>

                <section className="rounded-2xl bg-white/90 dark:bg-[#1e2330]/50 px-4 py-4 sm:px-6 sm:py-5">
                    <SectionTitle>Business Identity</SectionTitle>

                    <div className="mt-5 grid gap-x-4 gap-y-5 md:grid-cols-2">
                        <div data-tour="profile-name">
                            <Field
                                label="Legal Name"
                                name="name"
                                error={fieldErrors.name}
                            >
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={business.name || ""}
                                    maxLength={200}
                                    aria-invalid={Boolean(fieldErrors.name)}
                                    className={inputClassName}
                                />
                            </Field>
                        </div>

                        <div data-tour="profile-category">
                            <Field
                                label="Business Type"
                                name="categoryId"
                                error={fieldErrors.categoryId}
                            >
                                <Select
                                    name="categoryId"
                                    defaultValue={business.category?.id || ""}
                                    items={Object.fromEntries(
                                        businessTypes.map((businessType) => [
                                            businessType.id,
                                            businessType.name,
                                        ]),
                                    )}
                                >
                                    <SelectTrigger
                                        id="categoryId"
                                        aria-invalid={Boolean(
                                            fieldErrors.categoryId,
                                        )}
                                        className={`${inputClassName} w-full`}
                                    >
                                        <SelectValue placeholder="Select business type" />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        {businessTypes.map((businessType) => (
                                            <SelectItem
                                                key={businessType.id}
                                                value={businessType.id || ""}
                                            >
                                                {businessType.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>

                        <div className="md:col-span-2" data-tour="profile-about">
                            <Field
                                label="Public Description"
                                name="about"
                                error={fieldErrors.about}
                            >
                                <Textarea
                                    id="about"
                                    name="about"
                                    defaultValue={business.about || ""}
                                    maxLength={255}
                                    rows={3}
                                    aria-invalid={Boolean(fieldErrors.about)}
                                    className={`${textareaClassName} min-h-[103px]`}
                                />
                            </Field>
                        </div>
                    </div>
                </section>
            </div>

            <section className="flex flex-col gap-4 rounded-2xl pt-2 pb-0 sm:pt-3 sm:pb-0">
                <SectionTitle>Contact Information</SectionTitle>

                <div className="grid gap-5 lg:gap-10 lg:grid-cols-2">
                    <div className="flex flex-col gap-3">
                        <div data-tour="profile-email">
                            <Field
                                label="Email Address"
                                name="email"
                                error={fieldErrors.email}
                            >
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    defaultValue={business.email || ""}
                                    maxLength={255}
                                    aria-invalid={Boolean(fieldErrors.email)}
                                    className={`${inputClassName} text-[#6b7280]`}
                                />
                            </Field>
                        </div>

                        <Field
                            label="Website"
                            name="website"
                            error={fieldErrors.website}
                        >
                            <Input
                                id="website"
                                name="website"
                                type="url"
                                placeholder="https://example.com"
                                defaultValue={business.website || ""}
                                maxLength={255}
                                aria-invalid={Boolean(fieldErrors.website)}
                                className={`${inputClassName} text-[#6b7280]`}
                            />
                        </Field>

                        <div data-tour="profile-phone">
                            <Field
                                label="Phone Number"
                                name="phoneNumber"
                                error={fieldErrors.phoneNumber}
                            >
                                <Input
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    type="tel"
                                    placeholder="012 345 678"
                                    defaultValue={business.phoneNumber || ""}
                                    maxLength={30}
                                    aria-invalid={Boolean(
                                        fieldErrors.phoneNumber,
                                    )}
                                    className={`${inputClassName} text-[#6b7280]`}
                                />
                            </Field>
                        </div>

                        <div data-tour="profile-facebook-page">
                            <Field
                                label="Facebook Page"
                                name="facebookPage"
                                error={fieldErrors.facebookPage}>
                                <Input
                                    id="facebookPage"
                                    name="facebookPage"
                                    type="url"
                                    placeholder="https://facebook.com/yourpage"
                                    defaultValue={facebookPageUrl(business)}
                                    maxLength={255}
                                    aria-invalid={Boolean(
                                        fieldErrors.facebookPage,
                                    )}
                                    className={`${inputClassName} text-[#6b7280]`} />
                            </Field>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Field
                            label="Physical Address"
                            name="address"
                            error={fieldErrors.address}
                        >
                            <Textarea
                                key={detectedAddress ?? "saved"}
                                id="address"
                                name="address"
                                defaultValue={detectedAddress ?? business.address ?? ""}
                                maxLength={255}
                                rows={2}
                                aria-invalid={Boolean(fieldErrors.address)}
                                className={`${textareaClassName} min-h-[88px] text-[#6b7280]`}
                            />
                        </Field>

                        <Field
                            label="Google Map"
                            name="googleMap"
                            error={fieldErrors.googleMap}
                        >
                            <Input
                                id="googleMap"
                                name="googleMap"
                                type="url"
                                placeholder="https://maps.app.goo.gl/..."
                                defaultValue={business.googleMap || ""}
                                maxLength={255}
                                aria-invalid={Boolean(fieldErrors.googleMap)}
                                onBlur={autoDetectLocationFromLink}
                                className={`${textareaClassName} min-h-[90px] text-[#6b7280] underline`}
                            />
                            {isLinkingLocation && (
                                <p className="pl-1 text-xs text-muted-foreground">
                                    Reading the location from that link…
                                </p>
                            )}
                        </Field>
                    </div>
                </div>
            </section>

            <section className="flex flex-col gap-4 rounded-2xl pt-2 pb-0 sm:pt-3 sm:pb-0">
                <SectionTitle>Location</SectionTitle>
                <LocationMapPicker
                    key={locationResetKey}
                    initial={
                        locationOverride ?? {
                            lat: business.latitude ?? null,
                            lng: business.longitude ?? null,
                            provinceName: business.provinceName ?? "",
                            districtName: business.districtName ?? "",
                            communeName: business.communeName ?? "",
                        }
                    }
                    onChange={() => {
                        
                    }}
                />
            </section>

            <div className="sticky -bottom-8 z-30 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 rounded-b-xl border-t border-gray-100 dark:border-[#242937] bg-white dark:bg-[#1a1e29] px-4 py-3.5 sm:px-6 sm:py-4">
                <div className="flex w-full flex-row items-center justify-end gap-3 sm:w-auto sm:ml-auto" data-tour="profile-save">
                    <Button
                        type="button"
                        onClick={handleCancel}
                        disabled={isLoading}
                        variant="outline"
                        size="lg"
                        className="flex-1 sm:flex-initial min-w-[100px]"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        size="lg"
                        className="flex-1 sm:flex-initial min-w-[121px]"
                    >
                        {isLoading ? "Saving…" : "Save"}
                    </Button>
                </div>
            </div>
        </form>
    );
}

function ProfileQueryError({
    message,
    answered,
    onRetry,
}: {
    message: string;
    answered: boolean;
    onRetry: () => void;
}) {
    return (
        <div
            className="rounded-xl border border-danger/20 bg-danger/5 p-6 text-foreground shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]"
            role="alert"
        >
            <h2 className="text-lg font-bold">Unable to load business profile</h2>
            <p className="mt-2 text-sm text-[#636b74]">{message}</p>
            {!answered && (
                <p className="mt-4 text-sm text-[#636b74]">
                    Check the server&apos;s <code>API_BASE_URL</code> value and
                    the backend availability, then try again.
                </p>
            )}
            <Button
                type="button"
                onClick={onRetry}
                className="mt-5"
            >
                Try again
            </Button>
        </div>
    );
}

import { FormSkeleton } from "@/components/ui/skeleton";

export default function BusinessProfileForm() {
    const businessQuery = useGetBusinessProfileQuery();
    const categoriesQuery = useGetBusinessCategoriesQuery();

    if (businessQuery.isLoading) {
        return <FormSkeleton rows={6} />;
    }

    if (businessQuery.error || !businessQuery.data) {
        return (
            <ProfileQueryError
                message={getApiErrorMessage(
                    businessQuery.error,
                    "The business API could not be reached.",
                )}
                answered={hasApiErrorMessage(businessQuery.error)}
                onRetry={() => {
                    void businessQuery.refetch();
                    void categoriesQuery.refetch();
                }}
            />
        );
    }

    const business = businessQuery.data;
    const businessTypes = getBusinessTypes(
        business,
        categoriesQuery.data,
    );
    const profileKey = [
        business.id,
        business.name,
        business.category?.id,
        business.about,
        business.email,
        business.website,
        business.phoneNumber,
        business.address,
        business.googleMap,
        facebookPageUrl(business),
        business.provinceName,
        business.districtName,
        business.communeName,
        business.latitude,
        business.longitude,
        business.logo,
    ].join("|");

    return (
        <BusinessProfileEditor
            key={profileKey}
            business={business}
            businessTypes={businessTypes}
        />
    );
}
