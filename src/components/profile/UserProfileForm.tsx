"use client";

import {
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";
import {
    AtSign,
    BadgeCheck,
    Mail,
    MapPin,
    Phone,
    UserRound,
} from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/form-controls";
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
    userProfileGenders,
    userProfileSchema,
    type UserProfile,
    type UserProfileInput,
} from "@/lib/api/user-profile";
import {
    useGetUserProfileQuery,
    useUpdateUserProfileMutation,
} from "@/services/userProfileApi";

type FieldName = keyof UserProfileInput;
type FieldErrors = Partial<Record<FieldName, string>>;

const inputClassName = controlClassName;

const genderLabels: Record<(typeof userProfileGenders)[number], string> = {
    MALE: "Male",
    FEMALE: "Female",
    OTHER: "Other",
    UNSPECIFIED: "Prefer not to say",
};

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
    error: z.ZodError<UserProfileInput>,
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

function getInitials(profile: UserProfile) {
    const initials = [profile.firstName, profile.lastName]
        .filter(Boolean)
        .map((name) => name?.trim().charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return initials || profile.username?.slice(0, 2).toUpperCase() || "UP";
}

function getProfileName(profile: UserProfile) {
    return (
        [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
        profile.username ||
        "User profile"
    );
}

function Field({
    label,
    name,
    error,
    children,
}: {
    label: string;
    name: FieldName;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-2">
            <Label
                htmlFor={name}
                className="text-sm font-semibold text-[#424841]"
            >
                {label}
            </Label>
            {children}
            {error ? (
                <p className="text-xs text-accent" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function AccountDetail({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value?: string;
}) {
    return (
        <div className="flex gap-3 rounded-xl bg-[#f6f8f5] p-4">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-[#6b7569] uppercase">
                    {label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-[#1a222b]">
                    {value || "Not available"}
                </p>
            </div>
        </div>
    );
}

function UserProfileEditor({ profile }: { profile: UserProfile }) {
    const formRef = useRef<HTMLFormElement>(null);
    const initialProfilePicture = profile.profilePicture || "";
    const initialGender = userProfileGenders.includes(
        profile.gender as (typeof userProfileGenders)[number],
    )
        ? (profile.gender as (typeof userProfileGenders)[number])
        : "UNSPECIFIED";
    const [profilePicture, setProfilePicture] = useState(
        initialProfilePicture,
    );
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [status, setStatus] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);
    const [updateUserProfile, { isLoading }] =
        useUpdateUserProfileMutation();

    function handleCancel() {
        formRef.current?.reset();
        setProfilePicture(initialProfilePicture);
        setFieldErrors({});
        setStatus(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus(null);

        const formData = new FormData(event.currentTarget);
        const result = userProfileSchema.safeParse({
            firstName: String(formData.get("firstName") || ""),
            lastName: String(formData.get("lastName") || ""),
            phoneNumber: String(formData.get("phoneNumber") || ""),
            gender: String(formData.get("gender") || "UNSPECIFIED"),
            address: String(formData.get("address") || ""),
            profilePicture: String(formData.get("profilePicture") || ""),
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

        try {
            await updateUserProfile(result.data).unwrap();
            setStatus({
                type: "success",
                message: "Your profile was saved successfully.",
            });
        } catch (error) {
            setStatus({
                type: "error",
                message: getApiErrorMessage(
                    error,
                    "Unable to save your profile.",
                ),
            });
        }
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="flex flex-col gap-5">
                <section className="rounded-2xl border border-[#e4eae2] bg-white p-6 text-center shadow-[0_8px_30px_rgba(26,34,43,0.06)]">
                    <div className="mx-auto flex size-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[linear-gradient(145deg,#dff5e2,#b9e5bf)] text-3xl font-bold text-primary shadow-[0_6px_22px_rgba(0,147,42,0.18)]">
                        {profilePicture ? (
                            // The profile image URL is supplied by the user-profile API.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={profilePicture}
                                alt={`${getProfileName(profile)} profile`}
                                className="size-full object-cover"
                            />
                        ) : (
                            getInitials(profile)
                        )}
                    </div>
                    <h2 className="mt-4 text-xl font-bold text-[#161d16]">
                        {getProfileName(profile)}
                    </h2>
                    <p className="mt-1 text-sm text-[#657064]">
                        {profile.role || "Team member"}
                    </p>
                </section>

                <section className="rounded-2xl border border-[#e4eae2] bg-white p-5 shadow-[0_8px_30px_rgba(26,34,43,0.04)]">
                    <h2 className="text-base font-bold text-[#161d16]">
                        Account information
                    </h2>
                    <p className="mt-1 text-sm text-[#6b7569]">
                        These details are managed by your account provider.
                    </p>
                    <div className="mt-4 flex flex-col gap-3">
                        <AccountDetail
                            icon={<AtSign className="size-4" />}
                            label="Username"
                            value={profile.username}
                        />
                        <AccountDetail
                            icon={<Mail className="size-4" />}
                            label="Email"
                            value={profile.email}
                        />
                        <AccountDetail
                            icon={<BadgeCheck className="size-4" />}
                            label="Role"
                            value={profile.role}
                        />
                    </div>
                </section>
            </aside>

            <form
                ref={formRef}
                onSubmit={handleSubmit}
                noValidate
                className="rounded-2xl border border-[#e4eae2] bg-white p-5 shadow-[0_8px_30px_rgba(26,34,43,0.06)] sm:p-7"
            >
                <div className="flex items-start gap-3 border-b border-[#edf0ec] pb-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <UserRound className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-[#161d16]">
                            Personal details
                        </h2>
                        <p className="mt-1 text-sm text-[#657064]">
                            Keep your contact and profile information current.
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <Field
                        label="First name"
                        name="firstName"
                        error={fieldErrors.firstName}
                    >
                        <Input
                            id="firstName"
                            name="firstName"
                            defaultValue={profile.firstName || ""}
                            maxLength={255}
                            autoComplete="given-name"
                            aria-invalid={Boolean(fieldErrors.firstName)}
                            className={inputClassName}
                        />
                    </Field>

                    <Field
                        label="Last name"
                        name="lastName"
                        error={fieldErrors.lastName}
                    >
                        <Input
                            id="lastName"
                            name="lastName"
                            defaultValue={profile.lastName || ""}
                            maxLength={255}
                            autoComplete="family-name"
                            aria-invalid={Boolean(fieldErrors.lastName)}
                            className={inputClassName}
                        />
                    </Field>

                    <Field
                        label="Phone number"
                        name="phoneNumber"
                        error={fieldErrors.phoneNumber}
                    >
                        <div className="relative">
                            <Phone className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#7a8478]" />
                            <Input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                defaultValue={profile.phoneNumber || ""}
                                maxLength={30}
                                autoComplete="tel"
                                aria-invalid={Boolean(
                                    fieldErrors.phoneNumber,
                                )}
                                className={`${inputClassName} pl-11`}
                            />
                        </div>
                    </Field>

                    <Field
                        label="Gender"
                        name="gender"
                        error={fieldErrors.gender}
                    >
                        <Select
                            name="gender"
                            defaultValue={initialGender}
                            items={{
                                MALE: "Male",
                                FEMALE: "Female",
                                OTHER: "Other",
                                UNSPECIFIED: "Unspecified",
                            }}
                        >
                            <SelectTrigger
                                id="gender"
                                aria-invalid={Boolean(fieldErrors.gender)}
                                className={`${inputClassName} w-full`}
                            >
                                <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent align="start">
                                {userProfileGenders.map((gender) => (
                                    <SelectItem key={gender} value={gender}>
                                        {genderLabels[gender]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <div className="md:col-span-2">
                        <Field
                            label="Address"
                            name="address"
                            error={fieldErrors.address}
                        >
                            <div className="relative">
                                <MapPin className="pointer-events-none absolute top-4 left-4 size-4 text-[#7a8478]" />
                                <Textarea
                                    id="address"
                                    name="address"
                                    defaultValue={profile.address || ""}
                                    rows={3}
                                    autoComplete="street-address"
                                    aria-invalid={Boolean(
                                        fieldErrors.address,
                                    )}
                                    className="min-h-28 rounded-xl border-[#e2e8e0] bg-white py-3 pr-4 pl-11 text-base text-[#1a222b] placeholder:text-[#7a8478] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 md:text-base"
                                />
                            </div>
                        </Field>
                    </div>

                    <div className="md:col-span-2">
                        <Field
                            label="Profile picture URL"
                            name="profilePicture"
                            error={fieldErrors.profilePicture}
                        >
                            <Input
                                id="profilePicture"
                                name="profilePicture"
                                type="url"
                                inputMode="url"
                                value={profilePicture}
                                onChange={(event) =>
                                    setProfilePicture(event.target.value)
                                }
                                placeholder="https://example.com/profile.jpg"
                                aria-invalid={Boolean(
                                    fieldErrors.profilePicture,
                                )}
                                className={inputClassName}
                            />
                        </Field>
                    </div>
                </div>

                <div className="mt-8 flex flex-col gap-4 border-t border-[#edf0ec] pt-6 sm:flex-row sm:items-center">
                    <div
                        className="min-h-5 flex-1 text-sm"
                        aria-live="polite"
                    >
                        {status ? (
                            <p
                                className={
                                    status.type === "success"
                                        ? "text-primary"
                                        : "text-accent"
                                }
                                role={
                                    status.type === "error"
                                        ? "alert"
                                        : "status"
                                }
                            >
                                {status.message}
                            </p>
                        ) : null}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isLoading}
                        size="lg"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        size="lg"
                            className="min-w-28"
                    >
                        {isLoading ? "Saving…" : "Save changes"}
                    </Button>
                </div>
            </form>
        </div>
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
            className="rounded-2xl border border-accent/20 bg-white p-6 text-[#1a222b] shadow-[0_8px_30px_rgba(26,34,43,0.06)]"
            role="alert"
        >
            <h2 className="text-lg font-bold">Unable to load your profile</h2>
            <p className="mt-2 text-sm text-[#636b74]">{message}</p>
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

export default function UserProfileForm() {
    const profileQuery = useGetUserProfileQuery();

    if (profileQuery.isLoading) {
        return (
            <div
                className="min-h-[620px] animate-pulse rounded-2xl bg-[#e8ede7]"
                aria-label="Loading user profile"
            />
        );
    }

    if (profileQuery.error || !profileQuery.data) {
        return (
            <ProfileQueryError
                message={getApiErrorMessage(
                    profileQuery.error,
                    "The user profile API could not be reached.",
                )}
                onRetry={() => void profileQuery.refetch()}
            />
        );
    }

    const profile = profileQuery.data;
    const profileKey = [
        profile.userId,
        profile.username,
        profile.email,
        profile.firstName,
        profile.lastName,
        profile.phoneNumber,
        profile.gender,
        profile.role,
        profile.address,
        profile.profilePicture,
    ].join("|");

    return <UserProfileEditor key={profileKey} profile={profile} />;
}
