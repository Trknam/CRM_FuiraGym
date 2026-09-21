"use client";

import { useEffect, useState } from "react";

type AuditRow = {
    id: string;
    time: string;
    user: string;
    role: string;
    action: string;
    entity: string;
    target: string;
    details: string;
};

export default function AuditPage() {
    const [rows, setRows] = useState<AuditRow[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        void (async () => {
            try {
                const response = await fetch("/api/audit", {
                    credentials: "include",
                    cache: "no-store",
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message ?? "Không thể tải Audit.");
                setRows(data.data ?? []);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Không thể tải Audit.");
            }
        })();
    }, []);

    return (
        <div className="space-y-6 p-5 md:p-8">
            <div>
                <h1 className="text-2xl font-bold">Audit</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                    Theo dõi nhân viên nào thực hiện thao tác nào trong hệ thống.
                </p>
            </div>
            {error && (
                <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                    {error}
                </div>
            )}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] text-left">
                                <th className="px-4 py-3">Thời gian</th>
                                <th className="px-4 py-3">Người thực hiện</th>
                                <th className="px-4 py-3">Thao tác</th>
                                <th className="px-4 py-3">Đối tượng</th>
                                <th className="px-4 py-3">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                                    <td className="whitespace-nowrap px-4 py-3">
                                        {new Date(row.time).toLocaleString("vi-VN")}
                                    </td>
                                    <td className="px-4 py-3 font-semibold">{row.user}</td>
                                    <td className="px-4 py-3">{row.action}</td>
                                    <td className="px-4 py-3">
                                        {row.entity}
                                        {row.target ? " - " + row.target : ""}
                                    </td>
                                    <td className="px-4 py-3 text-[var(--muted)]">{row.details || "—"}</td>
                                </tr>
                            ))}
                            {rows.length === 0 && !error && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-[var(--muted)]">
                                        Chưa có nhật ký thao tác.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
