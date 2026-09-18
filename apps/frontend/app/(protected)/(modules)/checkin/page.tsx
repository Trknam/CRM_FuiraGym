import { CrudModulePage } from "@/components/modules/crud-module-page";

export default function CheckinPage() {
    return (
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
                    optionsEndpoint: "/api/members",
                },
                { key: "time", label: "Thời gian", type: "datetime-local", required: true },
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
                },
            ]}
            columns={["member", "time", "method", "status"]}
            removeActionLabel="Xóa check-in"
            removeConfirmMessage="Lượt check-in này sẽ bị xóa khỏi lịch sử. Thao tác này không thể hoàn tác. Bạn có chắc muốn tiếp tục?"
            bulkActionLabel="Xóa check-in"
            bulkConfirmMessage="Các lượt check-in đã chọn sẽ bị xóa khỏi lịch sử. Thao tác này không thể hoàn tác. Bạn có chắc muốn tiếp tục?"
            removeIcon="trash"
            seed={[]}
        />
    );
}
