"use client";

import { useState } from "react";
import { CrudModulePage } from "@/components/modules/crud-module-page";
import { PaymentQrPanel } from "@/components/payments/payment-qr-panel";
import { Check } from "lucide-react";
import type { CrudItem } from "@/components/modules/crud-module-page";

export default function PaymentsPage() {
    const [paymentRefreshKey, setPaymentRefreshKey] = useState(0);
    const [paymentModal, setPaymentModal] = useState<{
        values: Record<string, string | number>;
        paymentId: string;
        mode: "BANK_TRANSFER" | "CARD";
    } | null>(null);

    async function createPayment(values: Record<string, string | number>): Promise<CrudItem> {
        const response = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...values,
                status: "Chờ thanh toán",
            }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Không thể tạo giao dịch.");

        const saved = result.data as CrudItem;
        if (values.method === "Chuyển khoản" || values.method === "Thẻ") {
            setPaymentModal({
                values: {
                    ...values,
                    memberName: String(saved.member ?? ""),
                },
                paymentId: saved.id,
                mode: values.method === "Thẻ" ? "CARD" : "BANK_TRANSFER",
            });
        }
        return saved;
    }

    return (
        <>
            <CrudModulePage
                title="Thanh toán"
                description="Theo dõi giao dịch, doanh thu và lịch sử thanh toán."
                action="Tạo giao dịch"
                moduleKey="payments"
                fields={[
                    {
                        key: "memberId",
                        label: "Hội viên",
                        required: true,
                        type: "select",
                        optionsEndpoint: "/api/members",
                    },
                    { key: "amount", label: "Số tiền (VNĐ)", type: "number", required: true },
                    {
                        key: "method",
                        label: "Phương thức",
                        type: "select",
                        options: ["Tiền mặt", "Chuyển khoản", "Thẻ"],
                    },
                    {
                        key: "status",
                        label: "Trạng thái",
                        type: "select",
                        options: ["Đã thanh toán", "Chờ thanh toán", "Đã hủy"],
                        hiddenOnCreate: true,
                    },
                    { key: "date", label: "Ngày giao dịch", type: "date", required: true },
                ]}
                columns={["member", "amount", "method", "status", "date"]}
                removeActionLabel="Xóa giao dịch"
                removeConfirmMessage="Giao dịch này sẽ bị xóa khỏi lịch sử giao dịch. Thao tác này không thể hoàn tác. Bạn có chắc muốn tiếp tục?"
                bulkActionLabel="Xóa giao dịch"
                bulkConfirmMessage="Các giao dịch đã chọn sẽ bị xóa khỏi lịch sử giao dịch. Thao tác này không thể hoàn tác. Bạn có chắc muốn tiếp tục?"
                removeIcon="trash"
                rowAction={{
                    label: "Đã thanh toán",
                    endpoint: "/api/payments/:id/confirm",
                    method: "POST",
                    icon: <Check size={15} />,
                    confirmMessage:
                        "Xác nhận giao dịch này đã thực sự nhận được tiền? Trạng thái sẽ chuyển sang Đã thanh toán.",
                }}
                onCreate={createPayment}
                refreshKey={paymentRefreshKey}
                seed={[]}
            />
            <PaymentQrPanel
                values={paymentModal?.values ?? null}
                paymentId={paymentModal?.paymentId ?? ""}
                mode={paymentModal?.mode ?? null}
                onClose={() => setPaymentModal(null)}
                onConfirmed={() => {
                    setPaymentModal(null);
                    setPaymentRefreshKey((value) => value + 1);
                }}
            />
        </>
    );
}
