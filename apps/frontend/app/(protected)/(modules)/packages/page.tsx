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
            seed={[]}
        />
    );
}
