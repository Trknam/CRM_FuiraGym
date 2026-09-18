import { CrudModulePage } from "@/components/modules/crud-module-page";

export default function SettingsPage() {
    return (
        <CrudModulePage
            title="Cài đặt"
            description="Quản lý các cấu hình cơ bản của hệ thống GymCRM."
            action="Thêm cấu hình"
            moduleKey="settings"
            fields={[
                { key: "name", label: "Tên cấu hình", required: true },
                { key: "value", label: "Giá trị", required: true },
                {
                    key: "group",
                    label: "Nhóm",
                    type: "select",
                    options: ["Hệ thống", "Phòng Gym", "Thông báo"],
                },
            ]}
            columns={["name", "value", "group"]}
            seed={[]}
        />
    );
}
