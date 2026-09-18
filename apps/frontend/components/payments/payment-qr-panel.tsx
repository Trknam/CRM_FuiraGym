"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Landmark, X } from "lucide-react";

type Props = {
    values: Record<string, string | number> | null;
    paymentId: string;
    mode: "BANK_TRANSFER" | "CARD" | null;
    onClose: () => void;
    onConfirmed: (payment: Record<string, string | number>) => void;
};

type Member = { id: string; name?: string; fullName?: string; phone?: string };

export function PaymentQrPanel({ values, paymentId, mode, onClose, onConfirmed }: Props) {
    const [qrUrl, setQrUrl] = useState("");
    const [bankId, setBankId] = useState("");
    const [accountNo, setAccountNo] = useState("");
    const [accountName, setAccountName] = useState("");
    const [members, setMembers] = useState<Member[]>([]);
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvv, setCvv] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const amount = Math.round(Number(values?.amount ?? 0));
    const memberId = String(values?.memberId ?? "");
    const content = `THANH TOAN ${paymentId.slice(-8).toUpperCase()}`.slice(0, 25);

    useEffect(() => {
        if (!values || !paymentId || !mode) return;
        let cancelled = false;

        async function load() {
            try {
                const [settingsResponse, membersResponse] = await Promise.all([
                    fetch("/api/settings", { cache: "no-store" }),
                    fetch("/api/members", { cache: "no-store" }),
                ]);
                const settingsJson = settingsResponse.ok ? await settingsResponse.json() : { data: [] };
                const membersJson = membersResponse.ok ? await membersResponse.json() : { data: [] };
                const settings = Array.isArray(settingsJson.data) ? settingsJson.data : [];
                const get = (name: string) =>
                    settings.find((item: { name: string }) => item.name === name)?.value ?? "";
                if (!cancelled) {
                    setBankId(get("PAYMENT_BANK_ID") || "MB");
                    setAccountNo(get("PAYMENT_ACCOUNT_NO") || "0377433503");
                    setAccountName(get("PAYMENT_ACCOUNT_NAME") || "Trần Khánh Nam");
                    setMembers(
                        Array.isArray(membersJson.data)
                            ? membersJson.data.filter(
                                  (member: Member & { memberStatus?: string }) =>
                                      !member.memberStatus ||
                                      member.memberStatus === "Đang hoạt động",
                              )
                            : [],
                    );
                }

                if (mode === "BANK_TRANSFER") {
                    const response = await fetch(
                        `/api/payments/qr?amount=${amount}&addInfo=${encodeURIComponent(content)}`,
                        { cache: "no-store" },
                    );
                    const json = await response.json();
                    if (!response.ok) throw new Error(json.message ?? "Không thể tạo QR.");
                    if (!cancelled) setQrUrl(String(json.data.qrUrl));
                }
            } catch (err) {
                if (!cancelled)
                    setError(err instanceof Error ? err.message : "Không thể tải giao diện thanh toán.");
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [amount, content, mode, paymentId, values]);

    async function confirmPayment() {
        if (!paymentId) return;
        setBusy(true);
        setError("");
        try {
            const response = await fetch(`/api/payments/${paymentId}/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.message ?? "Không thể xác nhận thanh toán.");
            onConfirmed(json.data);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Không thể xác nhận thanh toán.");
        } finally {
            setBusy(false);
        }
    }

    function validateCard() {
        const digits = cardNumber.replace(/\s/g, "");
        if (!/^4\d{15}$/.test(digits))
            return "Số thẻ Visa phải gồm 16 chữ số và bắt đầu bằng số 4.";
        if (!/^\d{2}\/\d{2}$/.test(expiry)) return "Ngày hết hạn phải có dạng MM/YY.";
        if (!/^\d{3,4}$/.test(cvv)) return "CVV phải gồm 3 hoặc 4 chữ số.";
        return "";
    }

    function handleCardPayment() {
        const validation = validateCard();
        if (validation) {
            setError(validation);
            return;
        }
        void confirmPayment();
    }

    if (!values || !paymentId || !mode) return null;

    const member = members.find((item) => item.id === memberId);

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl">
                <button
                    type="button"
                    aria-label="Đóng"
                    className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                    onClick={onClose}
                >
                    <X size={18} />
                </button>

                {mode === "BANK_TRANSFER" ? (
                    <div>
                        <div className="border-b bg-gradient-to-br from-blue-50 to-white px-6 py-5">
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-blue-700">
                                    <Landmark size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Thanh toán chuyển khoản</h2>
                                    <p className="text-sm text-slate-500">
                                        Quét mã VietQR bằng ứng dụng ngân hàng
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-5 p-6 md:grid-cols-[280px_1fr]">
                            <div className="flex min-h-72 items-center justify-center rounded-2xl border bg-white p-3 shadow-sm">
                                {qrUrl ? (
                                    <img
                                        src={qrUrl}
                                        alt="VietQR thanh toán"
                                        className="h-64 w-64 object-contain"
                                    />
                                ) : (
                                    <div className="text-center text-sm text-slate-500">
                                        Đang tạo mã QR...
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="rounded-2xl border bg-slate-50 p-4">
                                    <div className="text-xs text-slate-500">Hội viên</div>
                                    <div className="mt-1 font-semibold">
                                        {member?.name ?? member?.fullName ?? memberId}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border p-4">
                                        <div className="text-xs text-slate-500">Số tiền</div>
                                        <div className="mt-1 text-lg font-bold">
                                            {amount.toLocaleString("vi-VN")} VNĐ
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border p-4">
                                        <div className="text-xs text-slate-500">Ngân hàng</div>
                                        <div className="mt-1 font-bold">{bankId} Bank</div>
                                    </div>
                                </div>
                                <div className="rounded-2xl border p-4">
                                    <div className="text-xs text-slate-500">Tài khoản nhận tiền</div>
                                    <div className="mt-1 font-semibold">{accountName}</div>
                                    <div className="mt-1 font-semibold tracking-wide">{accountNo}</div>
                                    <div className="mt-2 text-xs text-slate-500">
                                        Nội dung: <b>{content}</b>
                                    </div>
                                </div>
                                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    Giao dịch đang <b>Chờ thanh toán</b>. Sau khi kiểm tra đã nhận tiền,
                                    nhân viên bấm “Đã thanh toán”.
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t bg-slate-50 px-6 py-4">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Đóng
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={busy || !qrUrl}
                                onClick={() => void confirmPayment()}
                            >
                                <Check size={16} />
                                {busy ? "Đang xác nhận..." : "Đã thanh toán"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="border-b bg-gradient-to-br from-slate-50 to-white px-6 py-5">
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-700">
                                    <CreditCard size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Thanh toán bằng thẻ</h2>
                                    <p className="text-sm text-slate-500">
                                        Nhập thông tin thẻ Visa để xác nhận giao dịch
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="mb-5 rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.25em] text-slate-300">
                                            Visa
                                        </div>
                                        <div className="mt-7 text-xl font-semibold tracking-[0.16em]">
                                            {cardNumber
                                                ? cardNumber.replace(/\d(?=(\d{4})+$)/g, "•")
                                                : "•••• •••• •••• ••••"}
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black italic">VISA</div>
                                </div>
                                <div className="mt-5 flex justify-between text-xs text-slate-300">
                                    <span>THANH TOÁN GYM</span>
                                    <span>{expiry || "MM/YY"}</span>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <label className="text-sm font-semibold">
                                    Số thẻ Visa
                                    <input
                                        value={cardNumber}
                                        onChange={(event) =>
                                            setCardNumber(
                                                event.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 16)
                                                    .replace(/(\d{4})(?=\d)/g, "$1 "),
                                            )
                                        }
                                        inputMode="numeric"
                                        autoComplete="off"
                                        placeholder="4000 0000 0000 0000"
                                        className="field mt-2"
                                    />
                                </label>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="text-sm font-semibold">
                                        Ngày hết hạn
                                        <input
                                            value={expiry}
                                            onChange={(event) =>
                                                setExpiry(
                                                    event.target.value
                                                        .replace(/[^\d/]/g, "")
                                                        .slice(0, 5),
                                                )
                                            }
                                            inputMode="numeric"
                                            autoComplete="off"
                                            placeholder="MM/YY"
                                            className="field mt-2"
                                        />
                                    </label>
                                    <label className="text-sm font-semibold">
                                        CVV
                                        <input
                                            value={cvv}
                                            onChange={(event) =>
                                                setCvv(event.target.value.replace(/\D/g, "").slice(0, 4))
                                            }
                                            inputMode="numeric"
                                            autoComplete="off"
                                            type="password"
                                            placeholder="•••"
                                            className="field mt-2"
                                        />
                                    </label>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                                    <span>Số tiền thanh toán</span>
                                    <b>{amount.toLocaleString("vi-VN")} VNĐ</b>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Thông tin thẻ chỉ dùng để mô phỏng bước xác nhận trong website và
                                    không được lưu vào PostgreSQL.
                                </p>
                            </div>
                        </div>

                        <div className="border-t bg-slate-50 px-6 py-4">
                            {error && (
                                <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </p>
                            )}
                            <div className="flex justify-end gap-2">
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={busy}
                                    onClick={handleCardPayment}
                                >
                                    <Check size={16} />
                                    {busy ? "Đang xử lý..." : "Thanh toán"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {error && mode === "BANK_TRANSFER" && (
                    <div className="border-t bg-red-50 px-6 py-3 text-sm text-red-700">{error}</div>
                )}
            </div>
        </div>
    );
}