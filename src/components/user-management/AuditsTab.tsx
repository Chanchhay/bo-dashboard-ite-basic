"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import {
    EmptyState,
    ErrorState,
    LoadingState,
    Panel,
    PanelHeader,
    fieldClassName,
} from "@/components/user-management/ui";
import { getApiErrorMessage } from "@/lib/api-error";
import {
    auditActionTypes,
    auditTargetTypes,
    humanizeEnum,
} from "@/lib/api/user-management";
import { useGetAuditLogsQuery } from "@/services/userManagementApi";

const PAGE_SIZE = 20;

/** A select can't carry an empty value, so "no filter" needs a sentinel. */
const ALL = "__all";

function formatTimestamp(value: string | undefined) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export default function AuditsTab({
    canReadAudits,
}: {
    canReadAudits: boolean;
}) {
    const [actionType, setActionType] = useState("");
    const [targetType, setTargetType] = useState("");
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(0);

    const auditQuery = useGetAuditLogsQuery(
        { actionType, targetType, keyword, page, size: PAGE_SIZE },
        { skip: !canReadAudits },
    );

    // The audit log lives behind `admin-audit:read`; saying so beats a 403.
    if (!canReadAudits) {
        return (
            <Panel>
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 text-center">
                    <span className="grid size-11 place-items-center rounded-full bg-[#f2f3f1] dark:bg-[#252a38] text-[#5c6660] dark:text-[#94a3b8]">
                        <Lock className="size-5" aria-hidden="true" />
                    </span>
                    <p className="text-[15px] font-medium text-[#16181c] dark:text-[#f8fafc]">
                        You don&apos;t have access to the audit log
                    </p>
                    <p className="max-w-md text-[14px] text-[#8a8f89] dark:text-[#94a3b8]">
                        Viewing audits needs the{" "}
                        <code className="rounded bg-[#f2f3f1] dark:bg-[#252a38] text-[#16181c] dark:text-[#f8fafc] border border-transparent dark:border-[#333b4f] px-1.5 py-0.5 text-[13px]">
                            admin-audit:read
                        </code>{" "}
                        permission. Ask a platform administrator to grant it.
                    </p>
                </div>
            </Panel>
        );
    }

    const logs = auditQuery.data?.content || [];
    const meta = auditQuery.data?.page;
    const totalPages = meta?.totalPages ?? 0;
    const totalElements = meta?.totalElements ?? 0;

    const resetTo = (update: () => void) => {
        update();
        setPage(0);
    };

    return (
        <Panel>
            <PanelHeader
                title="Audits"
                description="Administrative changes recorded across the platform."
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                <div className="relative">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8a8f89]"
                        aria-hidden="true"
                    />
                    <label htmlFor="audit-keyword" className="sr-only">
                        Search audits
                    </label>
                    <input
                        id="audit-keyword"
                        type="search"
                        value={keyword}
                        onChange={(event) =>
                            resetTo(() => setKeyword(event.target.value))
                        }
                        placeholder="Search by actor or target"
                        className={`${fieldClassName} pl-9`}
                    />
                </div>

                <div>
                    <label htmlFor="audit-action" className="sr-only">
                        Filter by action
                    </label>
                    <SelectField
                        id="audit-action"
                        value={actionType || ALL}
                        onValueChange={(next) =>
                            resetTo(() =>
                                setActionType(next === ALL ? "" : next),
                            )
                        }
                        options={[
                            { value: ALL, label: "All actions" },
                            ...auditActionTypes.map((value) => ({
                                value,
                                label: humanizeEnum(value),
                            })),
                        ]}
                    />
                </div>

                <div>
                    <label htmlFor="audit-target" className="sr-only">
                        Filter by target
                    </label>
                    <SelectField
                        id="audit-target"
                        value={targetType || ALL}
                        onValueChange={(next) =>
                            resetTo(() =>
                                setTargetType(next === ALL ? "" : next),
                            )
                        }
                        options={[
                            { value: ALL, label: "All targets" },
                            ...auditTargetTypes.map((value) => ({
                                value,
                                label: humanizeEnum(value),
                            })),
                        ]}
                    />
                </div>
            </div>

            {auditQuery.isLoading ? (
                <LoadingState label="Loading audits" />
            ) : auditQuery.error ? (
                <ErrorState
                    message={getApiErrorMessage(
                        auditQuery.error,
                        "Unable to load the audit log.",
                    )}
                    retry={auditQuery.refetch}
                />
            ) : logs.length === 0 ? (
                <EmptyState
                    title="No audit entries"
                    description={
                        keyword || actionType || targetType
                            ? "No entries match these filters."
                            : "Administrative changes will appear here."
                    }
                />
            ) : (
                <>
                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-left">
                            <caption className="sr-only">
                                Administrative audit entries
                            </caption>
                            <thead>
                                <tr className="border-b border-[#eceeea] dark:border-[#242937] text-[12px] text-[#8a8f89] dark:text-[#94a3b8]">
                                    <th
                                        scope="col"
                                        className="py-3 pr-4 font-medium"
                                    >
                                        When
                                    </th>
                                    <th
                                        scope="col"
                                        className="py-3 pr-4 font-medium"
                                    >
                                        Actor
                                    </th>
                                    <th
                                        scope="col"
                                        className="py-3 pr-4 font-medium"
                                    >
                                        Action
                                    </th>
                                    <th
                                        scope="col"
                                        className="py-3 pr-4 font-medium"
                                    >
                                        Target
                                    </th>
                                    <th
                                        scope="col"
                                        className="py-3 font-medium"
                                    >
                                        Change
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="border-b border-[#f2f3f1] dark:border-[#242937] align-top last:border-0"
                                    >
                                        <td className="py-4 pr-4 text-[14px] whitespace-nowrap text-[#5c6660] dark:text-[#cbd5e1]">
                                            {formatTimestamp(log.createdAt)}
                                        </td>
                                        <td className="py-4 pr-4 text-[14px] text-[#16181c] dark:text-[#f8fafc]">
                                            {log.actorUsername ||
                                                log.actorId ||
                                                "—"}
                                        </td>
                                        <td className="py-4 pr-4 text-[14px] text-[#16181c] dark:text-[#f8fafc]">
                                            {humanizeEnum(log.actionType)}
                                        </td>
                                        <td className="py-4 pr-4 text-[14px] text-[#5c6660] dark:text-[#cbd5e1]">
                                            <p>{log.targetLabel || "—"}</p>
                                            <p className="text-[13px] text-[#8a8f89] dark:text-[#94a3b8]">
                                                {humanizeEnum(log.targetType)}
                                            </p>
                                        </td>
                                        <td className="py-4 text-[13px] text-[#8a8f89] dark:text-[#94a3b8]">
                                            {log.previousState ||
                                            log.newState ? (
                                                <span>
                                                    {log.previousState || "—"}
                                                    {" → "}
                                                    <span className="text-[#16181c] dark:text-[#f8fafc]">
                                                        {log.newState || "—"}
                                                    </span>
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <nav
                        aria-label="Audit pages"
                        className="mt-5 flex flex-wrap items-center justify-between gap-3"
                    >
                        <p className="text-[13px] text-[#8a8f89] dark:text-[#94a3b8]">
                            Page {page + 1} of {Math.max(totalPages, 1)} ·{" "}
                            {totalElements} entr
                            {totalElements === 1 ? "y" : "ies"}
                        </p>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                onClick={() => setPage((value) => value - 1)}
                                disabled={page === 0}
                                variant="outline"
                                size="sm"
                            >
                                <ChevronLeft
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Previous
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setPage((value) => value + 1)}
                                disabled={page + 1 >= totalPages}
                                variant="outline"
                                size="sm"
                            >
                                Next
                                <ChevronRight
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </Button>
                        </div>
                    </nav>
                </>
            )}
        </Panel>
    );
}
