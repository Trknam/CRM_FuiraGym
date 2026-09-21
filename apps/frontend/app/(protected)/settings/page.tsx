import { CrudModulePage } from "@/components/modules/crud-module-page";
import Link from "next/link";

export default function SettingsPage() {
    return (
        <div>
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
                removeIcon="trash"
            />
            <div className="px-5 pb-8 md:px-8">
                <Link href="/settings/audit" className="btn btn-secondary">
                    Xem Audit
                </Link>
            </div>
        </div>
    );
}
