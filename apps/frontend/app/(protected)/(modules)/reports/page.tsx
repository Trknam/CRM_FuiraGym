import { CrudModulePage } from "@/components/modules/crud-module-page";

export default function ReportsPage() {
    return (
        <CrudModulePage
            title="Báo cáo"
            description="Tổng hợp doanh thu, hội viên, check-in và tỷ lệ chuyển đổi."
            action="Làm mới báo cáo"
            moduleKey="reports"
            fields={[]}
            columns={["name", "type", "period", "status"]}
            seed={[]}
            readOnly
        />
    );
}
