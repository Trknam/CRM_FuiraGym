import { CrudModulePage } from "@/components/modules/crud-module-page";

export default function PackagesPage() {
    return (
        <CrudModulePage
            title="Gói tập"
            description="Quản lý các gói tập mà phòng Gym cung cấp."
            action="Thêm gói tập"
            moduleKey="packages"
            fields={[
                { key: "name", label: "Tên gói", required: true },
                { key: "duration", label: "Thời hạn (tháng)", type: "number", required: true },
                { key: "price", label: "Giá (VNĐ)", type: "number", required: true },
                {
                    key: "status",
                    label: "Trạng thái",
                    type: "select",
                    options: ["Đang bán", "Tạm dừng"],
                },
            ]}
            columns={["name", "duration", "price", "status"]}
            removeActionLabel="Ngừng bán"
            removeConfirmMessage="Gói tập sẽ được chuyển sang trạng thái tạm dừng và không bị xóa khỏi lịch sử. Bạn có chắc muốn tiếp tục?"
            removeIcon="pause"
            bulkActionLabel="Tạm dừng"
            bulkConfirmMessage="Các gói tập đã chọn sẽ được chuyển sang trạng thái tạm dừng và giữ lại lịch sử. Bạn có chắc muốn tiếp tục?"
            seed={[]}
        />
    );
}
