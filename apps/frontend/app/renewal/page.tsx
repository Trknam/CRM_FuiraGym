"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2, QrCode, XCircle } from "lucide-react";

type Result = {
    kind: "loading" | "payment" | "renewed" | "dismissed" | "expired" | "error";
    message: string;
    endDate?: string;
};

type PaymentData = {
    paymentId: string;
    amount: number;
    packageName: string;
    expiresAt: string;
    qrUrl: string;
    bankId: string;
    accountNo: string;
    accountName: string;
    addInfo: string;
};

export default function RenewalPage() {
    const params = useMemo(
        () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()),
        [],
    );
    const membershipId = params.get("membership") ?? "";
    const token = params.get("token") ?? "";
    const initialAction = params.get("action");
    const [result, setResult] = useState<Result>({
        kind: "loading",
        message: "Đang kiểm tra thông tin gói tập...",
    });
    const [payment, setPayment] = useState<PaymentData | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [busy, setBusy] = useState(false);

    async function requestRenewal() {
        if (!membershipId || !token) {
            setResult({ kind: "error", message: "Liên kết gia hạn không hợp lệ." });
            return;
        }
        setBusy(true);
        try {
            const response = await fetch("/api/public/renewal/" + encodeURIComponent(membershipId), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, action: "renew" }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message ?? "Không thể tạo yêu cầu thanh toán.");
            const nextPayment = data.data as PaymentData;
            setPayment(nextPayment);
            setSecondsLeft(Math.max(0, Math.ceil((new Date(nextPayment.expiresAt).getTime() - Date.now()) / 1000)));
            setResult({ kind: "payment", message: data.data.message });
        } catch (error) {
            setResult({ kind: "error", message: error instanceof Error ? error.message : "Không thể tạo yêu cầu thanh toán." });
        } finally {
            setBusy(false);
        }
    }

    async function dismiss() {
        if (!membershipId || !token || busy) return;
        setBusy(true);
        try {
            const response = await fetch("/api/public/renewal/" + encodeURIComponent(membershipId), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, action: "dismiss" }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message ?? "Không thể đóng yêu cầu.");
            setResult({ kind: "dismissed", message: data.data?.message ?? "Đã đóng lựa chọn gia hạn." });
        } catch (error) {
            setResult({ kind: "error", message: error instanceof Error ? error.message : "Không thể đóng yêu cầu." });
        } finally {
            setBusy(false);
        }
    }

    async function confirmPaid() {
        if (!payment || busy || secondsLeft <= 0) return;
        setBusy(true);
        try {
            const response = await fetch(
                "/api/public/renewal/" + encodeURIComponent(membershipId) + "/payment",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, paymentId: payment.paymentId }),
                },
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.message ?? "Không thể xác nhận thanh toán.");
            setResult({
                kind: "renewed",
                message: data.data?.message ?? "Thanh toán thành công. Gói tập đã được gia hạn.",
                endDate: data.data?.endDate,
            });
            setPayment(null);
        } catch (error) {
            setResult({ kind: "error", message: error instanceof Error ? error.message : "Không thể xác nhận thanh toán." });
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        if (!membershipId || !token) {
            setResult({ kind: "error", message: "Liên kết gia hạn không hợp lệ." });
            return;
        }
        if (initialAction === "renew") void requestRenewal();
        if (initialAction === "dismiss") void dismiss();
        // Email links intentionally execute the selected action on page load.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [membershipId, token, initialAction]);

    useEffect(() => {
        if (!payment || result.kind !== "payment") return;
        const timer = window.setInterval(() => {
            const left = Math.max(0, Math.ceil((new Date(payment.expiresAt).getTime() - Date.now()) / 1000));
            setSecondsLeft(left);
            if (left <= 0) {
                window.clearInterval(timer);
                setPayment(null);
                setResult({
                    kind: "expired",
                    message: "Đã hết 7 phút. Mã QR đã hết hạn và yêu cầu gia hạn đã được hủy.",
                });
            }
        }, 1000);
        return () => window.clearInterval(timer);
    }, [payment, result.kind]);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = String(secondsLeft % 60).padStart(2, "0");

    return (
        <main className="min-h-screen bg-[#f7f8fa] px-4 py-10">
            <div className="mx-auto max-w-lg rounded-3xl border border-[#e8ebf2] bg-white p-7 shadow-sm md:p-9">
                <div className="mb-7 text-center">
                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-black text-white font-bold">FG</div>
                    <h1 className="text-2xl font-bold">FuiraGym</h1>
                    <p className="mt-1 text-sm text-[#667085]">Gia hạn gói tập</p>
                </div>

                {result.kind === "loading" && (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#667085]">
                        <Loader2 className="animate-spin" size={18} />
                        {result.message}
                    </div>
                )}

                {result.kind === "payment" && payment && (
                    <div>
                        <div className="rounded-2xl bg-[#f8fafc] p-5 text-center">
                            <QrCode className="mx-auto mb-3" size={28} />
                            <h2 className="text-lg font-bold">Thanh toán để hoàn tất gia hạn</h2>
                            <p className="mt-1 text-sm text-[#667085]">Gói: {payment.packageName}</p>
                            <p className="mt-2 text-xl font-bold">{payment.amount.toLocaleString("vi-VN")} VNĐ</p>
                            <div className="mx-auto my-5 w-fit rounded-2xl border bg-white p-3">
                                <img src={payment.qrUrl} alt="QR thanh toán gia hạn" className="h-64 w-64" />
                            </div>
                            <p className="text-sm font-semibold">Ngân hàng: {payment.bankId}</p>
                            <p className="text-sm">STK: {payment.accountNo}</p>
                            <p className="text-sm">Tên TK: {payment.accountName}</p>
                            <p className="mt-2 text-sm">Nội dung: <b>{payment.addInfo}</b></p>
                            <div className="mt-5 flex items-center justify-center gap-2 text-red-600">
                                <Clock3 size={18} />
                                <b>Còn {minutes}:{seconds}</b>
                            </div>
                        </div>
                        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                            Hiện tại FuiraGym chưa kết nối trực tiếp với ngân hàng để tự kiểm tra tiền về.
                            <br />
                            <b>Tạm thời cho đồ án:</b> sau khi chuyển khoản thành công, hãy bấm “Tôi đã thanh toán”
                            để mô phỏng ngân hàng xác nhận tiền về.
                            {/* Khi tích hợp ngân hàng thật, thay nút này bằng trạng thái tự động
                                cập nhật từ webhook/payment provider. */}
                        </div>
                        <button
                            type="button"
                            disabled={busy || secondsLeft <= 0}
                            onClick={() => void confirmPaid()}
                            className="mt-4 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {busy ? "Đang xác nhận..." : "Tôi đã thanh toán"}
                        </button>
                    </div>
                )}

                {result.kind === "renewed" && (
                    <div className="text-center">
                        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
                        <h2 className="text-xl font-bold">Gia hạn thành công</h2>
                        <p className="mt-2 text-sm leading-6 text-[#667085]">{result.message}</p>
                        {result.endDate && (
                            <p className="mt-3 text-sm font-semibold">
                                Ngày hết hạn mới: {new Date(result.endDate).toLocaleDateString("vi-VN")}
                            </p>
                        )}
                        <p className="mt-6 text-sm text-[#667085]">
                            Cảm ơn anh/chị đã tin tưởng và đến với FuiraGym.
                            <br />Chúc anh/chị một ngày tốt lành.
                        </p>
                    </div>
                )}

                {result.kind === "dismissed" && (
                    <div className="text-center">
                        <Clock3 className="mx-auto mb-4 h-12 w-12 text-[#667085]" />
                        <h2 className="text-xl font-bold">Đã đóng lựa chọn gia hạn</h2>
                        <p className="mt-2 text-sm leading-6 text-[#667085]">Anh/chị có thể liên hệ FuiraGym khi sẵn sàng gia hạn.</p>
                    </div>
                )}

                {result.kind === "expired" && (
                    <div className="text-center">
                        <XCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
                        <h2 className="text-xl font-bold">Yêu cầu gia hạn đã hết hạn</h2>
                        <p className="mt-2 text-sm leading-6 text-[#667085]">{result.message}</p>
                    </div>
                )}

                {result.kind === "error" && (
                    <div className="text-center">
                        <XCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
                        <p className="text-sm leading-6 text-red-600">{result.message}</p>
                    </div>
                )}

                {result.kind === "loading" && (
                    <div className="mt-7 flex gap-3">
                        <button type="button" disabled={busy} onClick={() => void requestRenewal()} className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                            {busy ? "Đang xử lý..." : "Đồng ý gia hạn"}
                        </button>
                        <button type="button" disabled={busy} onClick={() => void dismiss()} className="flex-1 rounded-xl border border-[#d0d5dd] px-4 py-3 text-sm font-semibold text-[#344054] disabled:opacity-50">
                            Suy nghĩ sau
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}