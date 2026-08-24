"use client";

import { FormEvent, useState } from "react";
import { CircleCheck, KeyRound, LoaderCircle, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { FormSkeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api-error";
import {
    bakongSettingsSchema,
    type BakongSettings,
    type BakongSettingsInput,
} from "@/lib/api/bakong";
import type { Khqr } from "@/lib/api/pos-order";
import {
    useGetBakongSettingsQuery,
    usePreviewKhqrMutation,
    useSaveBakongSettingsMutation,
    useSetBakongActiveMutation,
} from "@/services/bakongApi";

type Fields = Record<string, string>;

const BLANK: Fields = {
    accountType: "INDIVIDUAL",
    bakongAccountId: "",
    merchantName: "",
    merchantCity: "",
    merchantId: "",
    acquiringBank: "",
    mobileNumber: "",
    storeLabel: "",
};

export function BusinessPaymentsForm() {
    const { toast } = useToast();
    const { data, isLoading } = useGetBakongSettingsQuery();
    const [save, { isLoading: isSaving }] = useSaveBakongSettingsMutation();
    const [setActive, { isLoading: isToggling }] = useSetBakongActiveMutation();
    const [preview, { isLoading: isPreviewing }] = usePreviewKhqrMutation();

    const [previewQr, setPreviewQr] = useState<Khqr | null>(null);

    const settings = data?.settings;
    const hasToken = Boolean(settings?.apiTokenConfigured);

    async function handleToggle(next: boolean) {
        try {
            await setActive(next).unwrap();
            toast({
                tone: "success",
                title: next ? "KHQR is now on" : "KHQR is now off",
            });
        } catch (cause) {
            toast({
                tone: "error",
                title: "Could not change KHQR",
                description: getApiErrorMessage(cause, "Please try again."),
            });
        }
    }

    async function handlePreview() {
        setPreviewQr(null);

        try {
            setPreviewQr(await preview({ amount: 1 }).unwrap());
        } catch (cause) {
            toast({
                tone: "error",
                title: "Could not create a test code",
                description: getApiErrorMessage(
                    cause,
                    "Check the details above and save first.",
                ),
            });
        }
    }

    if (isLoading) {
        return <FormSkeleton rows={4} />;
    }

    return (
        <div data-tour="business-payments-form" className="flex flex-col gap-6">
            <section data-tour="payments-toggle" className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">
                            Accept KHQR at the till
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {data?.configured
                                ? "Customers can scan to pay when this is on."
                                : "Add your Bakong account below to turn this on."}
                        </p>
                    </div>

                    <Switch
                        checked={Boolean(data?.active)}
                        disabled={!data?.configured || isToggling}
                        onCheckedChange={handleToggle}
                        aria-label="Accept KHQR at the till"
                    />
                </div>

                {data?.configured && !hasToken && (
                    <p className="mt-4 flex items-start gap-2 rounded-xl bg-warning/15 px-3 py-2 text-sm text-warning">
                        <KeyRound
                            className="mt-0.5 size-4 shrink-0"
                            aria-hidden="true"
                        />
                        No API token saved. Codes may generate but payments will
                        never be confirmed.
                    </p>
                )}
            </section>

            <AccountForm
                key={settings?.id ?? "new"}
                settings={settings}
                hasToken={hasToken}
                isSaving={isSaving}
                canPreview={Boolean(data?.configured)}
                isPreviewing={isPreviewing}
                onPreview={handlePreview}
                onSave={async (input) => {
                    await save(input).unwrap();
                    toast({ tone: "success", title: "Payment settings saved" });
                }}
            />
            {previewQr && <PreviewCard khqr={previewQr} />}
        </div>
    );
}

function AccountForm({
    settings,
    hasToken,
    isSaving,
    canPreview,
    isPreviewing,
    onPreview,
    onSave,
}: {
    settings: BakongSettings | null | undefined;
    hasToken: boolean;
    isSaving: boolean;
    canPreview: boolean;
    isPreviewing: boolean;
    onPreview: () => void;
    onSave: (input: BakongSettingsInput) => Promise<void>;
}) {
    const { toast } = useToast();
    const [fields, setFields] = useState<Fields>(() => ({
        ...BLANK,
        accountType: settings?.accountType ?? "INDIVIDUAL",
        bakongAccountId: settings?.bakongAccountId ?? "",
        merchantName: settings?.merchantName ?? "",
        merchantCity: settings?.merchantCity ?? "",
        merchantId: settings?.merchantId ?? "",
        acquiringBank: settings?.acquiringBank ?? "",
        mobileNumber: settings?.mobileNumber ?? "",
        storeLabel: settings?.storeLabel ?? "",
    }));
    const [apiToken, setApiToken] = useState("");
    const [replacingToken, setReplacingToken] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const set = (name: string) => (value: string) => {
        setFields((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const candidate = {
            ...(fields as unknown as BakongSettingsInput),
            apiToken: apiToken.trim() || undefined,
        };

        const result = bakongSettingsSchema.safeParse(candidate);

        if (!result.success) {
            const next: Record<string, string> = {};

            for (const issue of result.error.issues) {
                const key = String(issue.path[0] ?? "");
                if (key && !next[key]) next[key] = issue.message;
            }

            setErrors(next);
            return;
        }

        try {
            await onSave(result.data);
            setApiToken("");
            setReplacingToken(false);
        } catch (cause) {
            toast({
                tone: "error",
                title: "Could not save payment settings",
                description: getApiErrorMessage(cause, "Please try again."),
            });
        }
    }

    return (
            <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-border bg-card p-5"
            >
                <h2 className="text-base font-semibold text-foreground">
                    Bakong account
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    These details appear on the customer&apos;s phone when they
                    scan.
                </p>

                <div data-tour="payments-account" className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Account type" error={errors.accountType}>
                        <SelectField
                            value={fields.accountType}
                            onValueChange={set("accountType")}
                            options={[
                                { value: "INDIVIDUAL", label: "Individual" },
                                { value: "MERCHANT", label: "Merchant" },
                            ]}
                        />
                    </Field>

                    <Field
                        label="Bakong account ID"
                        error={errors.bakongAccountId}
                        hint="For example, your_name@bank"
                    >
                        <Input
                            value={fields.bakongAccountId}
                            onChange={(e) =>
                                set("bakongAccountId")(e.target.value)
                            }
                            placeholder="your_name@bank"
                        />
                    </Field>

                    <Field label="Merchant name" error={errors.merchantName}>
                        <Input
                            value={fields.merchantName}
                            onChange={(e) => set("merchantName")(e.target.value)}
                        />
                    </Field>

                    <Field label="City" error={errors.merchantCity}>
                        <Input
                            value={fields.merchantCity}
                            onChange={(e) => set("merchantCity")(e.target.value)}
                            placeholder="Phnom Penh"
                        />
                    </Field>

                    <Field label="Merchant ID" optional>
                        <Input
                            value={fields.merchantId}
                            onChange={(e) => set("merchantId")(e.target.value)}
                        />
                    </Field>

                    <Field label="Acquiring bank" optional>
                        <Input
                            value={fields.acquiringBank}
                            onChange={(e) =>
                                set("acquiringBank")(e.target.value)
                            }
                        />
                    </Field>

                    <Field label="Mobile number" optional>
                        <Input
                            value={fields.mobileNumber}
                            onChange={(e) => set("mobileNumber")(e.target.value)}
                        />
                    </Field>

                    <Field label="Store label" optional>
                        <Input
                            value={fields.storeLabel}
                            onChange={(e) => set("storeLabel")(e.target.value)}
                        />
                    </Field>
                </div>

                <div data-tour="payments-token" className="mt-5 border-t border-border pt-5">
                    <Label>API token</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                        From Bakong Open API. Used to confirm that a payment
                        actually arrived.
                    </p>

                    {hasToken && !replacingToken ? (
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
                                <CircleCheck
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Saved
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setReplacingToken(true)}
                            >
                                Replace token
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-2 flex flex-col gap-2">
                            <Input
                                type="password"
                                value={apiToken}
                                autoComplete="off"
                                onChange={(e) => setApiToken(e.target.value)}
                                placeholder="Paste your Bakong API token"
                            />
                            {hasToken && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReplacingToken(false);
                                        setApiToken("");
                                    }}
                                    className="self-start text-sm text-muted-foreground underline"
                                >
                                    Keep the existing token
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
                    <Button type="submit" data-tour="payments-save" disabled={isSaving}>
                        {isSaving && (
                            <LoaderCircle
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        Save
                    </Button>

                    {/* Proves the settings work without ringing up a sale. */}
                    <Button
                        type="button"
                        data-tour="payments-test"
                        variant="outline"
                        onClick={onPreview}
                        disabled={!canPreview || isPreviewing}
                    >
                        <QrCode className="size-4" aria-hidden="true" />
                        {isPreviewing ? "Testing…" : "Test with $1 code"}
                    </Button>
                </div>
            </form>
    );
}

function PreviewCard({ khqr }: { khqr: Khqr }) {
    return (
                <section className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5">
                    <h2 className="text-base font-semibold text-foreground">
                        Test code
                    </h2>
                    <p className="max-w-md text-center text-sm text-muted-foreground">
                        A throwaway $1 code. Scanning it would charge you, so
                        this is only to confirm the details are accepted.
                    </p>
                    {khqr.qrImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={khqr.qrImage}
                            alt="Test KHQR code"
                            className="size-56 rounded-xl bg-white p-3 object-contain"
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            The code was created but returned no image.
                        </p>
                    )}
                </section>
    );
}

function Field({
    label,
    error,
    hint,
    optional,
    children,
}: {
    label: string;
    error?: string;
    hint?: string;
    optional?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label>
                {label}
                {optional && (
                    <span className="ml-1 font-normal text-muted-foreground">
                        (optional)
                    </span>
                )}
            </Label>
            {children}
            {hint && !error && (
                <p className="text-xs text-muted-foreground">{hint}</p>
            )}
            {error && (
                <p role="alert" className="text-xs text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}
