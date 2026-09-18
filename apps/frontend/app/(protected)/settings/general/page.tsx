"use client";

import { useEffect, useState } from "react";

type Setting = { id: string; name: string; value: string; group: string };

const paymentFields = [
    { name: "PAYMENT_BANK_ID", label: "Ngân hàng", placeholder: "MB", defaultValue: "MB" },
    {
        name: "PAYMENT_ACCOUNT_NO",
        label: "Số tài khoản",
        placeholder: "0377433503",
        defaultValue: "0377433503",
    },
    {
        name: "PAYMENT_ACCOUNT_NAME",
        label: "Tên tài khoản",
        placeholder: "Trần Khánh Nam",
        defaultValue: "Trần Khánh Nam",
    },
];

export default function GeneralSettingsPage() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        void loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const response = await fetch("/api/settings", { cache: "no-store" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message ?? "Không thể tải cài đặt.");
            const data = Array.isArray(result.data) ? (result.data as Setting[]) : [];
            setSettings(data);
            setValues(
                Object.fromEntries(
                    paymentFields.map((field) => [
                        field.name,
                        data.find((item) => item.name === field.name)?.value ?? field.defaultValue,
                    ]),
                ),
            );
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Không thể tải cài đặt.");
        } finally {
            setLoading(false);
        }
    }

    async function savePaymentSettings() {
        setSaving(true);
        setMessage("");
        try {
            for (const field of paymentFields) {
                const current = settings.find((item) => item.name === field.name);
                const body = {
                    name: field.name,
                    value: values[field.name] ?? "",
                    group: "Thanh toán",
                };
                const response = await fetch("/api/settings", {
                    method: current ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(current ? { id: current.id, ...body } : body),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message ?? "Không thể lưu cài đặt.");
            }
            await loadSettings();
            setMessage("Đã lưu cấu hình tài khoản nhận tiền.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Không thể lưu cài đặt.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="card p-6">
                <h1 className="text-2xl font-bold">Cài đặt chung</h1>
                <p className="mt-2 text-sm text-[var(--muted)]">
                    Các thiết lập chung của hệ thống FuiraGym.
                </p>
            </div>

            <div className="card overflow-hidden">
                <div className="border-b border-[var(--border)] p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold">Tài khoản nhận thanh toán</h2>
                            <p className="mt-1 text-sm text-[var(--muted)]">
                                Tài khoản dùng để nhận chuyển khoản và tạo mã VietQR.
                            </p>
                        </div>
                        <div className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
                            MB Bank
                        </div>
                    </div>
                </div>
                <div className="grid gap-4 p-6 md:grid-cols-3">
                    {paymentFields.map((field) => (
                        <label key={field.name} className="text-sm font-medium">
                            {field.label}
                            <input
                                value={values[field.name] ?? ""}
                                onChange={(event) =>
                                    setValues((current) => ({
                                        ...current,
                                        [field.name]: event.target.value,
                                    }))
                                }
                                placeholder={field.placeholder}
                                disabled={loading || saving}
                                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 font-normal"
                            />
                        </label>
                    ))}
                </div>
                <div className="mx-6 mb-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
                        Xem trước tài khoản nhận tiền
                    </div>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-lg font-bold text-slate-900">
                                {values.PAYMENT_ACCOUNT_NAME || "Chưa có tên tài khoản"}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                                {values.PAYMENT_ACCOUNT_NO || "Chưa có số tài khoản"}
                            </div>
                        </div>
                        <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
                            <div className="text-xs text-slate-500">Ngân hàng</div>
                            <div className="font-bold text-slate-900">
                                {values.PAYMENT_BANK_ID || "Chưa cấu hình"}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-6 pb-6">
                    <button
                        type="button"
                        onClick={savePaymentSettings}
                        disabled={loading || saving}
                        className="btn btn-primary"
                    >
                        {saving ? "Đang lưu..." : "Lưu cấu hình thanh toán"}
                    </button>
                    {message && <span className="text-sm">{message}</span>}
                </div>
            </div>
        </div>
    );
}
