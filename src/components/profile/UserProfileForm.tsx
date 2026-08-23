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
    Camera,
    Mail,
    MapPin,
    Phone,
    UserRound,
} from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/form-controls";
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
    profilePictureRules,
    userProfileGenders,
    userProfileSchema,
    type UserProfile,
    type UserProfileInput,
} from "@/lib/api/user-profile";
import {
    useDeleteProfilePictureMutation,
    useGetUserProfileQuery,
    useUpdateUserProfileMutation,
    userProfileApi,
} from "@/services/userProfileApi";
import { useAppDispatch } from "@/store/hooks";

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

/**
 * A backend that keeps one path per user answers a save with the URL the
 * browser already has cached, and the old picture would stay on screen. Tagging
 * the unchanged URL forces the new bytes to be fetched.
 */
function withFreshPicture(updated: UserProfile, previous: string) {
    const picture = updated.profilePicture;

    if (!picture || picture !== previous) {
        return updated;
    }

    return {
        ...updated,
        profilePicture: `${picture}${picture.includes("?") ? "&" : "?"}v=${Date.now()}`,
    };
}

// Both helpers read the names being typed rather than the stored profile, so
// the summary card tracks the form as it is edited.
function getInitials(firstName: string, lastName: string, username?: string) {
    const initials = [firstName, lastName]
        .map((name) => name.trim().charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return initials || username?.slice(0, 2).toUpperCase() || "UP";
}

function getProfileName(
    firstName: string,
    lastName: string,
    username?: string,
) {
    return (
        [firstName, lastName]
            .map((name) => name.trim())
            .filter(Boolean)
            .join(" ") ||
        username ||
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
                className="text-sm font-semibold text-[#424841] dark:text-[#cbd5e1]"
            >
                {label}
            </Label>
            {children}
            {error ? (
                <p className="text-xs text-danger" role="alert">
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
        <div className="flex gap-3 rounded-xl bg-[#f6f8f5] dark:bg-[#151821] border border-transparent dark:border-[#242937] p-4">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-[#6b7569] dark:text-[#94a3b8] uppercase">
                    {label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-[#1a222b] dark:text-[#f8fafc]">
                    {value || "Not available"}
                </p>
            </div>
        </div>
    );
}

function UserProfileEditor({ profile }: { profile: UserProfile }) {
    const dispatch = useAppDispatch();
    const formRef = useRef<HTMLFormElement>(null);
    const storedPicture = profile.profilePicture || "";
    const initialGender = userProfileGenders.includes(
        profile.gender as (typeof userProfileGenders)[number],
    )
        ? (profile.gender as (typeof userProfileGenders)[number])
        : "UNSPECIFIED";
    // The names drive the summary card while they are typed, so they are the
    // two fields this form keeps in state.
    const [firstName, setFirstName] = useState(profile.firstName || "");
    const [lastName, setLastName] = useState(profile.lastName || "");
    // The picked file travels with the rest of the form, so it stays staged
    // until the save carries it up.
    const picture = useStagedImage(profilePictureRules, storedPicture);
    // Picture feedback sits under the avatar, next to the control it belongs
    // to, rather than in the form's status line.
    const [pictureNote, setPictureNote] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const { toast } = useToast();
    const [updateUserProfile, { isLoading: isSaving }] =
        useUpdateUserProfileMutation();
    const [deleteProfilePicture, { isLoading: isRemovingPicture }] =
        useDeleteProfilePictureMutation();
    const profileName = getProfileName(firstName, lastName, profile.username);

    /**
     * Publishes a mutation's answer to every reader of the profile — this form
     * and the account menu in the header — without waiting for a refetch.
     */
    function publishProfile(updated: UserProfile) {
        dispatch(
            userProfileApi.util.upsertQueryData(
                "getUserProfile",
                undefined,
                updated,
            ),
        );
    }

    function handlePicturePick(file: File) {
        picture.pick(file);
        setPictureNote("New picture ready — save to apply it.");
    }

    /** Clearing the avatar has its own endpoint, so it applies immediately. */
    async function handlePictureRemove() {
        setPictureNote(null);

        try {
            await deleteProfilePicture().unwrap();
            picture.reset();
            publishProfile({ ...profile, profilePicture: "" });
            setPictureNote("Profile picture removed.");
        } catch (error) {
            toast({
                tone: "error",
                title: "Profile picture not removed",
                description: getApiErrorMessage(
                    error,
                    "Unable to remove your profile picture.",
                ),
            });
        }
    }

    function handleCancel() {
        formRef.current?.reset();
        setFirstName(profile.firstName || "");
        setLastName(profile.lastName || "");
        picture.reset();
        setFieldErrors({});
        setPictureNote(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const result = userProfileSchema.safeParse({
            firstName,
            lastName,
            phoneNumber: String(formData.get("phoneNumber") || ""),
            gender: String(formData.get("gender") || "UNSPECIFIED"),
            address: String(formData.get("address") || ""),
        });

        if (!result.success) {
            setFieldErrors(getFieldErrors(result.error));
            toast({
                tone: "error",
                title: "Check the highlighted fields",
                description: "Some details still need your attention.",
            });
            return;
        }

        setFieldErrors({});

        try {
            // One multipart request carries the fields and, when one was
            // picked, the new picture.
            const updated = await updateUserProfile({
                ...result.data,
                file: picture.file,
            }).unwrap();

            publishProfile(
                picture.file
                    ? withFreshPicture(updated, storedPicture)
                    : updated,
            );
            picture.reset();
            setPictureNote(null);
            toast({
                tone: "success",
                title: "Profile saved",
                description: "Your profile was saved successfully.",
            });
        } catch (error) {
            toast({
                tone: "error",
                title: "Profile not saved",
                description: getApiErrorMessage(
                    error,
                    "Unable to save your profile.",
                ),
            });
        }
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="flex flex-col gap-5">
                <section className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-6 text-center shadow-[0_8px_30px_rgba(26,34,43,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                    <ImagePicker
                        rules={profilePictureRules}
                        disabled={isSaving}
                        busy={isSaving && Boolean(picture.file)}
                        previewShape="circle"
                        label="Profile picture"
                        onPick={handlePicturePick}
                        onError={(message) =>
                            toast({
                                tone: "error",
                                title: "Profile picture not selected",
                                description: message,
                            })
                        }
                        preview={
                            <span className="relative inline-flex size-28 items-center justify-center">
                                <span className="flex size-full items-center justify-center overflow-hidden rounded-full border-4 border-white dark:border-[#1a1e29] bg-[linear-gradient(145deg,#dff5e2,#b9e5bf)] dark:bg-[linear-gradient(145deg,#153e1a,#1e5426)] text-3xl font-bold text-primary dark:text-[#6ee7b7] shadow-md">
                                    {picture.preview ? (
                                        // The API supplies this URL dynamically and
                                        // the staged preview uses a blob URL.
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={picture.preview}
                                            alt={`${profileName} profile`}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        getInitials(
                                            firstName,
                                            lastName,
                                            profile.username,
                                        )
                                    )}
                                </span>
                                <span className="absolute right-0 bottom-0 z-10 grid size-9 place-items-center rounded-full border-2 border-white dark:border-[#1a1e29] bg-primary text-white shadow-md">
                                    <Camera
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                            </span>
                        }
                        actions={
                            picture.file ? (
                                <Button
                                    type="button"
                                    variant="link"
                                    size="xs"
                                    disabled={isSaving}
                                    onClick={() => {
                                        picture.reset();
                                        setPictureNote(null);
                                    }}
                                    className="h-auto px-0 text-xs text-[#6b7569]"
                                >
                                    Undo
                                </Button>
                            ) : storedPicture ? (
                                <Button
                                    type="button"
                                    variant="link"
                                    size="xs"
                                    disabled={isSaving || isRemovingPicture}
                                    onClick={handlePictureRemove}
                                    className="h-auto px-0 text-xs text-danger hover:text-danger/80 font-medium"
                                >
                                    {isRemovingPicture
                                        ? "Removing…"
                                        : "Remove photo"}
                                </Button>
                            ) : null
                        }
                    />

                    <h2 className="mt-4 text-xl font-bold text-[#161d16] dark:text-[#f8fafc]">
                        {profileName}
                    </h2>
                    <p className="mt-1 text-sm text-[#657064] dark:text-[#94a3b8]">
                        {profile.role || "Team member"}
                    </p>
                    <div className="min-h-4" aria-live="polite">
                        {pictureNote ? (
                            <p className="mt-2 text-xs text-primary" role="status">
                                {pictureNote}
                            </p>
                        ) : null}
                    </div>
                </section>

                <section className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                    <h2 className="text-base font-bold text-[#161d16] dark:text-[#f8fafc]">
                        Account Information
                    </h2>
                    <p className="mt-1 text-sm text-[#6b7569] dark:text-[#94a3b8]">
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
                className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7"
            >
                <div className="flex items-start gap-3 border-b border-[#edf0ec] dark:border-[#242937] pb-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <UserRound className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-[#161d16] dark:text-[#f8fafc]">
                            Personal details
                        </h2>
                        <p className="mt-1 text-sm text-[#657064] dark:text-[#94a3b8]">
                            Keep your contact and profile information current.
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <Field
                        label="First Name"
                        name="firstName"
                        error={fieldErrors.firstName}
                    >
                        <Input
                            id="firstName"
                            name="firstName"
                            value={firstName}
                            onChange={(event) =>
                                setFirstName(event.target.value)
                            }
                            maxLength={255}
                            autoComplete="given-name"
                            aria-invalid={Boolean(fieldErrors.firstName)}
                            className={inputClassName}
                        />
                    </Field>

                    <Field
                        label="Last Name"
                        name="lastName"
                        error={fieldErrors.lastName}
                    >
                        <Input
                            id="lastName"
                            name="lastName"
                            value={lastName}
                            onChange={(event) =>
                                setLastName(event.target.value)
                            }
                            maxLength={255}
                            autoComplete="family-name"
                            aria-invalid={Boolean(fieldErrors.lastName)}
                            className={inputClassName}
                        />
                    </Field>

                    <Field
                        label="Phone Number"
                        name="phoneNumber"
                        error={fieldErrors.phoneNumber}
                    >
                        <div className="relative">
                            <Phone className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#7a8478] dark:text-[#94a3b8]" />
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
                                <MapPin className="pointer-events-none absolute top-4 left-4 size-4 text-[#7a8478] dark:text-[#94a3b8]" />
                                <Textarea
                                    id="address"
                                    name="address"
                                    defaultValue={profile.address || ""}
                                    rows={3}
                                    autoComplete="street-address"
                                    aria-invalid={Boolean(
                                        fieldErrors.address,
                                    )}
                                    className="min-h-28 rounded-xl border border-[#e2e8e0] dark:border-[#242937] bg-white dark:bg-[#1e2330] py-3 pr-4 pl-11 text-base text-[#1a222b] dark:text-[#f8fafc] placeholder:text-[#7a8478] dark:placeholder:text-[#94a3b8] focus-visible:border-gray-400 dark:focus-visible:border-gray-600 focus-visible:ring-1 focus-visible:ring-gray-400/20 md:text-base"
                                />
                            </div>
                        </Field>
                    </div>

                </div>

                <div className="mt-8 flex flex-col gap-4 border-t border-[#edf0ec] dark:border-[#242937] pt-6 sm:flex-row sm:items-center">
                    <div className="flex-1" />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSaving}
                        size="lg"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSaving}
                        size="lg"
                            className="min-w-28"
                    >
                        {isSaving ? "Saving…" : "Save changes"}
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
            className="rounded-2xl border border-danger/20 bg-card p-6 text-foreground shadow-[0_8px_30px_rgba(26,34,43,0.06)]"
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

import { FormSkeleton } from "@/components/ui/skeleton";

export default function UserProfileForm() {
    const profileQuery = useGetUserProfileQuery();

    if (profileQuery.isLoading) {
        return <FormSkeleton rows={6} />;
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

    // Keyed on the account only: the editor holds live edits, and every save
    // pushes its answer back into this query, so remounting on each change
    // would throw away what the user is typing.
    return (
        <UserProfileEditor
            key={profile.userId || "user-profile"}
            profile={profile}
        />
    );
}


