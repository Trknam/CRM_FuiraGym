"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { CrudModulePage } from "@/components/modules/crud-module-page";

type Member = {
    id: string;
    name: string;
    memberCode: string;
    package: string;
    endDate: string | null;
};
export default function CheckinPage() {
    const [qrCode, setQrCode] = useState("");
    const [qrImage, setQrImage] = useState("");

    async function createCheckin(values: Record<string, string | number>) {
        const method = String(values.method ?? "");

        if (method === "QR Code") {
            const response = await fetch("/api/checkins/qr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId: values.memberId }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể tạo QR.");

            const value = String(result.data.qrCode);
            const qrUrl =
                window.location.origin + "/checkin/qr?code=" + encodeURIComponent(value);
            setQrCode(value);
            setQrImage(await QRCode.toDataURL(qrUrl, { width: 320, margin: 2 }));
            return;
        }

        const response = await fetch("/api/checkins", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Không thể tạo check-in.");
        return result.data;
    }

    const qrResult = qrImage ? (
        <div className="text-center">
            <h3 className="text-base font-bold">QR check-in</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
                Đưa mã này cho hội viên dùng điện thoại quét để check-in.
            </p>
            <div className="mt-4 inline-flex rounded-2xl border border-[var(--border)] bg-white p-4">
                <img src={qrImage} alt="QR check-in cho hội viên" width={320} height={320} />
            </div>
            <p className="mt-3 break-all text-xs text-[var(--muted)]">Mã: {qrCode}</p>
        </div>
    ) : null;

    return (
        <>
            <CrudModulePage
                title="Check-in"
                description="Kiểm tra lượt vào tập và trạng thái membership."
                action="Tạo check-in"
                moduleKey="checkins"
                fields={[
                    {
                        key: "memberId",
                        label: "Hội viên",
                        required: true,
                        type: "select",
                        optionsEndpoint: "/api/checkins/eligible-members",
                        optionLabel: (item) => {
                            const name = String(item.name ?? "Không xác định");
                            return name;
                        },
                        optionDescription: (item) => {
                            const packageName = String(item.package ?? "Chưa có gói");
                            const endDate = item.endDate ? new Date(String(item.endDate)) : null;
                            const end =
                                endDate && !Number.isNaN(endDate.getTime())
                                    ? String(endDate.getDate()).padStart(2, "0") +
                                      "/" +
                                      String(endDate.getMonth() + 1).padStart(2, "0") +
                                      "/" +
                                      endDate.getFullYear()
                                    : "—";
                            return "Gói: " + packageName + " · Hết hạn: " + end;
                        },
                    },
                    {
                        key: "time",
                        label: "Thời gian",
                        type: "datetime-local",
                        required: true,
                        hiddenOnCreate: true,
                    },
                    {
                        key: "method",
                        label: "Phương thức",
                        type: "select",
                        options: ["QR Code", "Quầy lễ tân"],
                    },
                    {
                        key: "status",
                        label: "Trạng thái",
                        type: "select",
                        options: ["Hợp lệ", "Từ chối"],
                        hiddenOnCreate: true,
                    },
                ]}
                columns={["member", "time", "method", "status"]}
                removeActionLabel="Xóa check-in"
                removeConfirmMessage="Lượt check-in này sẽ bị xóa khỏi lịch sử. Thao tác này không thể hoàn tác. Bạn có chắc muốn tiếp tục?"
                bulkActionLabel="Xóa check-in"
                bulkConfirmMessage="Các lượt check-in đã chọn sẽ bị xóa khỏi lịch sử. Thao tác này không thể hoàn tác. Bạn có chắc muốn tiếp tục?"
                removeIcon="trash"
                onCreate={createCheckin}
                keepCreateModalOpen={(values) => String(values.method ?? "") === "QR Code"}
                createResult={qrResult}
                onOpenCreate={() => {
                    setQrCode("");
                    setQrImage("");
                }}
                seed={[]}
            />
        </>
    );
}
