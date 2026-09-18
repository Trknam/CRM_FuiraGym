"use client";

import { useEffect, useState } from "react";

type Member = { id: string; name?: string; fullName?: string; phone?: string };
type Payment = { id: string; member: string; amount: number; status: string };

export function PaymentQrPanel() {
    const [members, setMembers] = useState<Member[]>([]);
    const [memberId, setMemberId] = useState("");
    const [amount, setAmount] = useState("");
    const [content, setContent] = useState("THANH TOAN GYM");
    const [bankId, setBankId] = useState("");
    const [accountNo, setAccountNo] = useState("");
    const [accountName, setAccountName] = useState("");
    const [qrUrl, setQrUrl] = useState("");
    const [payment, setPayment] = useState<Payment | null>(null);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        void Promise.all([
            fetch("/api/members", { cache: "no-store" }).then((r) =>
                r.ok ? r.json() : { data: [] },
            ),
            fetch("/api/settings", { cache: "no-store" }).then((r) =>
                r.ok ? r.json() : { data: [] },
            ),
        ]).then(([memberJson, settingJson]) => {
            setMembers(Array.isArray(memberJson.data) ? memberJson.data : []);
            const data = Array.isArray(settingJson.data) ? settingJson.data : [];
            const get = (name: string) =>
                data.find((x: { name: string }) => x.name === name)?.value ?? "";
            setBankId(get("PAYMENT_BANK_ID"));
            setAccountNo(get("PAYMENT_ACCOUNT_NO"));
            setAccountName(get("PAYMENT_ACCOUNT_NAME"));
        });
    }, []);

    async function createPayment() {
        setBusy(true);
        setMessage("");
        setPayment(null);
        setQrUrl("");
        try {
            const value = Math.round(Number(amount));
            if (!memberId || !Number.isFinite(value) || value <= 0)
                throw new Error("Hãy chọn hội viên và nhập số tiền lớn hơn 0.");
            const create = await fetch("/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    memberId,
                    amount: value,
                    method: "Chuyển khoản",
                    status: "Chờ thanh toán",
                    date: new Date().toISOString().slice(0, 10),
                }),
            });
            const created = await create.json();
            if (!create.ok) throw new Error(created.message ?? "Không thể tạo giao dịch.");
            const row = created.data as Payment;
            const qr = await fetch(
                `/api/payments/qr?amount=${value}&addInfo=${encodeURIComponent(content.trim().slice(0, 25))}`,
                { cache: "no-store" },
            );
            const qrJson = await qr.json();
            if (!qr.ok) throw new Error(qrJson.message ?? "Không thể tạo QR.");
            setPayment(row);
            setQrUrl(qrJson.data.qrUrl);
            setMessage("Đã tạo giao dịch. Chờ khách chuyển khoản, sau đó nhân viên xác nhận.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra.");
        } finally {
            setBusy(false);
        }
    }

    async function confirmPayment() {
        if (!payment) return;
        setBusy(true);
        try {
            const response = await fetch(`/api/payments/${payment.id}/confirm`, { method: "POST" });
            const json = await response.json();
            if (!response.ok) throw new Error(json.message ?? "Không thể xác nhận.");
            setPayment(json.data);
            setMessage("✅ Thanh toán đã được xác nhận và lưu vào PostgreSQL.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Không thể xác nhận thanh toán.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">Thanh toán VietQR</h2>
                <p className="text-sm text-muted-foreground">
                    Tạo giao dịch → khách chuyển khoản → nhân viên xác nhận. Không cần cổng thanh
                    toán trả phí.
                </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm">
                    Hội viên
                    <select
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                    >
                        <option value="">-- Chọn hội viên --</option>
                        {members.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name ?? m.fullName}
                                {m.phone ? ` - ${m.phone}` : ""}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="text-sm">
                    Số tiền (VNĐ)
                    <input
                        type="number"
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="500000"
                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                    />
                </label>
                <label className="text-sm">
                    Nội dung
                    <input
                        value={content}
                        maxLength={25}
                        onChange={(e) => setContent(e.target.value)}
                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                    />
                </label>
            </div>
            <div className="mt-4 rounded-xl border bg-muted/30 p-3 text-sm">
                <b>Tài khoản nhận tiền:</b> {bankId || "chưa cấu hình"} ·{" "}
                {accountNo || "chưa cấu hình"} · {accountName || "chưa cấu hình"}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
                <button
                    onClick={createPayment}
                    disabled={busy}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                    {busy ? "Đang xử lý..." : "Tạo giao dịch + QR"}
                </button>
                {payment?.status === "Chờ thanh toán" && (
                    <button
                        onClick={confirmPayment}
                        disabled={busy}
                        className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                    >
                        Xác nhận đã thanh toán
                    </button>
                )}
            </div>
            {message && <p className="mt-3 text-sm font-medium">{message}</p>}
            {payment && (
                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_260px]">
                    <div className="rounded-xl border p-4 text-sm">
                        <p>
                            Mã giao dịch: <b>{payment.id}</b>
                        </p>
                        <p>
                            Hội viên: <b>{payment.member}</b>
                        </p>
                        <p>
                            Số tiền: <b>{payment.amount.toLocaleString("vi-VN")} VNĐ</b>
                        </p>
                        <p>
                            Trạng thái: <b>{payment.status}</b>
                        </p>
                    </div>
                    <div className="flex min-h-64 items-center justify-center rounded-xl border bg-white p-3">
                        {qrUrl && (
                            <img
                                src={qrUrl}
                                alt="VietQR thanh toán"
                                className="h-56 w-56 object-contain"
                            />
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
