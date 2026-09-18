import { CrudModulePage } from "@/components/modules/crud-module-page";
import { PaymentQrPanel } from "@/components/payments/payment-qr-panel";

export default function PaymentsPage() {
    return (
        <>
            <PaymentQrPanel />
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
                    },
                    { key: "date", label: "Ngày giao dịch", type: "date", required: true },
                ]}
                columns={["member", "amount", "method", "status", "date"]}
                seed={[]}
            />
        </>
    );
}
