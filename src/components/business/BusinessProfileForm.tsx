"use client";

import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
    type ReactNode,
} from "react";
import Image from "next/image";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
    controlClassName,
    textareaClassName as sharedTextareaClassName,
} from "@/components/ui/form-controls";
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
import {
    businessLogoAccept,
    businessProfileSchema,
    getBusinessLogoError,
    type Business,
    type BusinessCategory,
    type BusinessProfileInput,
    type BusinessSubCategory,
} from "@/lib/api/business";
import {
    businessApi,
    useDeleteBusinessLogoMutation,
    useGetBusinessCategoriesQuery,
    useGetBusinessProfileQuery,
    useUpdateBusinessProfileMutation,
    useUploadBusinessLogoMutation,
} from "@/services/businessApi";
import { useAppDispatch } from "@/store/hooks";

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
                className="pl-1 text-base leading-[16.5px] font-semibold text-[#424841]"
            >
                {label}
            </Label>
            {children}
            {error ? (
                <p className="pl-1 text-xs text-accent" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function SectionTitle({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <h2 className="pl-1 text-base leading-6 font-bold text-[#020409] uppercase">
                {children}
            </h2>
            <span className="h-0.5 w-8 bg-[rgba(67,103,70,0.3)]" />
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

// This form's styling is the app-wide reference; both names stay as local
// aliases so the rest of the file reads unchanged.
const inputClassName = controlClassName;
const textareaClassName = sharedTextareaClassName;

function BusinessProfileEditor({
    business,
    businessTypes,
}: {
    business: Business;
    businessTypes: BusinessSubCategory[];
}) {
    const dispatch = useAppDispatch();
    const [updateBusinessProfile, { isLoading: isSaving }] =
        useUpdateBusinessProfileMutation();
    const [uploadBusinessLogo, { isLoading: isUploadingLogo }] =
        useUploadBusinessLogoMutation();
    const [deleteBusinessLogo, { isLoading: isDeletingLogo }] =
        useDeleteBusinessLogoMutation();
    const isLoading = isSaving || isUploadingLogo || isDeletingLogo;
    const formRef = useRef<HTMLFormElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const objectUrlRef = useRef<string | null>(null);
    const initialLogo = business.logo || "";
    const [logoPreview, setLogoPreview] = useState(initialLogo);
    // The picked file and the "remove" intent are both applied on save, so a
    // cancelled edit never touches the stored logo.
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoRemoved, setLogoRemoved] = useState(false);
    const [logoError, setLogoError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [status, setStatus] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    function releaseObjectUrl() {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }

    function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const fileError = getBusinessLogoError(file);

        if (fileError) {
            setLogoError(fileError);
            event.target.value = "";
            return;
        }

        releaseObjectUrl();
        objectUrlRef.current = URL.createObjectURL(file);
        setLogoPreview(objectUrlRef.current);
        setLogoFile(file);
        setLogoRemoved(false);
        setLogoError(null);
    }

    function handleLogoRemove() {
        releaseObjectUrl();

        if (logoInputRef.current) {
            logoInputRef.current.value = "";
        }

        setLogoPreview("");
        setLogoFile(null);
        setLogoRemoved(Boolean(initialLogo));
        setLogoError(null);
    }

    /** Drops a staged upload or removal and restores the stored logo. */
    function handleCancelLogoChange() {
        releaseObjectUrl();

        if (logoInputRef.current) {
            logoInputRef.current.value = "";
        }

        setLogoPreview(initialLogo);
        setLogoFile(null);
        setLogoRemoved(false);
        setLogoError(null);
    }

    function handleCancel() {
        formRef.current?.reset();
        releaseObjectUrl();
        setLogoPreview(initialLogo);
        setLogoFile(null);
        setLogoRemoved(false);
        setLogoError(null);
        setFieldErrors({});
        setStatus(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus(null);

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
        });

        if (!result.success) {
            setFieldErrors(getFieldErrors(result.error));
            setStatus({
                type: "error",
                message: "Check the highlighted fields and try again.",
            });
            return;
        }

        setFieldErrors({});

        let logoChanged = false;

        try {
            // The logo lives behind its own endpoints, so it is sent first and
            // the profile update below refreshes the cached business for both.
            if (logoFile) {
                await uploadBusinessLogo(logoFile).unwrap();
                logoChanged = true;
            } else if (logoRemoved) {
                await deleteBusinessLogo().unwrap();
                logoChanged = true;
            }

            await updateBusinessProfile(result.data).unwrap();
            setStatus({
                type: "success",
                message: "Business profile saved successfully.",
            });
        } catch (error) {
            if (logoChanged) {
                // The logo already changed on the server; pull the business
                // back so the form is not left showing a stale image.
                dispatch(businessApi.util.invalidateTags(["Business"]));
            }

            setStatus({
                type: "error",
                message: getApiErrorMessage(
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
            className="flex min-h-[847px] flex-col gap-6 rounded-xl bg-white p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]"
        >
            <div className="grid gap-[30px] xl:grid-cols-[303px_minmax(0,1fr)]">
                <div className="flex min-h-[281px] flex-col items-center rounded-2xl border-2 border-dashed border-[rgba(194,200,190,0.3)] bg-white px-5 pt-9 pb-6 shadow-[0_4px_10px_rgba(26,34,43,0.04)] focus-within:border-primary">
                    <Label className="flex cursor-pointer flex-col items-center outline-none">
                        <Input
                            ref={logoInputRef}
                            type="file"
                            accept={businessLogoAccept}
                            className="sr-only"
                            disabled={isLoading}
                            onChange={handleLogoChange}
                        />
                        <span className="relative flex size-32 items-center justify-center overflow-hidden rounded-full bg-[#e8e8e8]">
                            {logoPreview ? (
                                // The API supplies this URL dynamically and the local preview uses a blob URL.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={logoPreview}
                                    alt="Business logo preview"
                                    className="size-full object-cover"
                                />
                            ) : (
                                <Image
                                    src={asset("camera.svg")}
                                    alt=""
                                    width={33}
                                    height={30}
                                    className="h-[30px] w-[33px]"
                                />
                            )}
                        </span>
                        <span className="mt-4 text-base leading-6 font-bold text-[#1a222b]">
                            Business Logo
                        </span>
                        <span className="mt-1 max-w-[210px] text-center text-[11px] leading-[16.5px] font-normal text-[#424841]">
                            Click to browse files. PNG, JPG, WebP or SVG up to
                            5&nbsp;MB.
                        </span>
                    </Label>

                    <div className="mt-2 flex min-h-8 flex-col items-center gap-1">
                        {logoError ? (
                            <p
                                className="text-center text-[11px] leading-4 text-accent"
                                role="alert"
                            >
                                {logoError}
                            </p>
                        ) : null}
                        {logoFile ? (
                            <p className="text-center text-[10px] leading-4 text-[#6b7280]">
                                {logoFile.name} — uploads when you save.
                            </p>
                        ) : null}
                        {logoRemoved ? (
                            <p className="text-center text-[10px] leading-4 text-[#6b7280]">
                                Logo removed — applies when you save.
                            </p>
                        ) : null}
                        {logoPreview || logoRemoved ? (
                            <Button
                                type="button"
                                variant="link"
                                size="xs"
                                disabled={isLoading}
                                onClick={
                                    logoFile || logoRemoved
                                        ? handleCancelLogoChange
                                        : handleLogoRemove
                                }
                                className="h-auto px-0 text-[11px] text-[#6b7280]"
                            >
                                {logoFile || logoRemoved
                                    ? "Undo logo change"
                                    : "Remove logo"}
                            </Button>
                        ) : null}
                    </div>
                </div>

                <section className="rounded-2xl bg-white/90 px-6">
                    <SectionTitle>Business Identity</SectionTitle>

                    <div className="mt-5 grid gap-x-4 gap-y-5 md:grid-cols-2">
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

                        <Field
                            label="Business Type"
                            name="categoryId"
                            error={fieldErrors.categoryId}
                        >
                            <Select
                                name="categoryId"
                                defaultValue={business.category?.id || ""}
                                /* Without this the trigger shows the raw id. */
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

                        <div className="md:col-span-2">
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

            <section className="flex flex-col gap-4 rounded-2xl py-6">
                <SectionTitle>Contact Information</SectionTitle>

                <div className="grid gap-10 lg:grid-cols-2">
                    <div className="flex flex-col gap-3">
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

                        <Field
                            label="Website"
                            name="website"
                            error={fieldErrors.website}
                        >
                            <Input
                                id="website"
                                name="website"
                                type="text"
                                inputMode="url"
                                defaultValue={business.website || ""}
                                maxLength={255}
                                aria-invalid={Boolean(fieldErrors.website)}
                                className={`${inputClassName} text-[#6b7280]`}
                            />
                        </Field>

                        <Field
                            label="Phone Number"
                            name="phoneNumber"
                            error={fieldErrors.phoneNumber}
                        >
                            <Input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                defaultValue={business.phoneNumber || ""}
                                maxLength={30}
                                aria-invalid={Boolean(
                                    fieldErrors.phoneNumber,
                                )}
                                className={`${inputClassName} text-[#6b7280]`}
                            />
                        </Field>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Field
                            label="Physical Address"
                            name="address"
                            error={fieldErrors.address}
                        >
                            <Textarea
                                id="address"
                                name="address"
                                defaultValue={business.address || ""}
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
                            <Textarea
                                id="googleMap"
                                name="googleMap"
                                defaultValue={business.googleMap || ""}
                                maxLength={255}
                                rows={2}
                                aria-invalid={Boolean(fieldErrors.googleMap)}
                                className={`${textareaClassName} min-h-[90px] text-[#6b7280] underline`}
                            />
                        </Field>
                    </div>
                </div>
            </section>

            <div className="mt-auto flex min-h-[105px] flex-col items-end justify-end gap-3 pt-2 sm:flex-row">
                <div className="mr-auto min-h-6" aria-live="polite">
                    {status ? (
                        <p
                            className={
                                status.type === "success"
                                    ? "text-sm text-primary"
                                    : "text-sm text-accent"
                            }
                            role={status.type === "error" ? "alert" : "status"}
                        >
                            {status.message}
                        </p>
                    ) : null}
                </div>
                <Button
                    type="button"
                    onClick={handleCancel}
                    disabled={isLoading}
                    variant="outline"
                    size="lg"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isLoading}
                    size="lg"
                    className="min-w-[121px]"
                >
                    {isLoading ? "Saving…" : "Save"}
                </Button>
            </div>
        </form>
    );
}

function ProfileQueryError({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div
            className="rounded-xl border border-accent/20 bg-accent/5 p-6 text-[#1a222b] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]"
            role="alert"
        >
            <h2 className="text-lg font-bold">Unable to load business profile</h2>
            <p className="mt-2 text-sm text-[#636b74]">{message}</p>
            <p className="mt-4 text-sm text-[#636b74]">
                Check the server&apos;s <code>API_BASE_URL</code> value and the
                backend availability, then try again.
            </p>
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

export default function BusinessProfileForm() {
    const businessQuery = useGetBusinessProfileQuery();
    const categoriesQuery = useGetBusinessCategoriesQuery();

    if (businessQuery.isLoading) {
        return (
            <div
                className="min-h-[847px] animate-pulse rounded-xl bg-[#f7f8f7]"
                aria-label="Loading business profile"
            />
        );
    }

    if (businessQuery.error || !businessQuery.data) {
        return (
            <ProfileQueryError
                message={getApiErrorMessage(
                    businessQuery.error,
                    "The business API could not be reached.",
                )}
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
