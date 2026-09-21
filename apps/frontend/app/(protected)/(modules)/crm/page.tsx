import { CrudModulePage } from "@/components/modules/crud-module-page";

export default function CrmPage() {
    return (
        <CrudModulePage
            title="CRM chăm sóc"
            description="Nhân viên chủ động gọi điện, tư vấn, follow-up và ghi lại lịch sử chăm sóc. Các email nhắc tự động của hệ thống được xử lý riêng."
            action="Tạo hoạt động chăm sóc"
            moduleKey="crm"
            fields={[
                {
                    key: "memberId",
                    label: "Hội viên",
                    required: false,
                    type: "select",
                    optionsEndpoint: "/api/members",
                },
                {
                    key: "leadId",
                    label: "Lead",
                    required: false,
                    type: "select",
                    optionsEndpoint: "/api/leads",
                },
                {
                    key: "type",
                    label: "Loại chăm sóc",
                    type: "select",
                    options: ["Gọi điện", "Tư vấn", "Follow-up", "Hẹn gặp", "Nhắn tin", "Ghi chú chăm sóc"],
                    required: true,
                },
                {
                    key: "note",
                    label: "Nội dung / kết quả",
                    required: true,
                },
                {
                    key: "status",
                    label: "Trạng thái",
                    type: "select",
                    options: ["Chưa xử lý", "Đã xử lý"],
                    required: true,
                },
                {
                    key: "date",
                    label: "Ngày / giờ hẹn follow-up",
                    type: "datetime-local",
                },
            ]}
            columns={["member", "lead", "type", "note", "status", "date", "createdBy"]}
            columnLabels={{
                member: "Hội viên",
                lead: "Lead",
                type: "Loại chăm sóc",
                note: "Nội dung / kết quả",
                status: "Trạng thái",
                date: "Lịch hẹn",
                createdBy: "Nhân viên phụ trách",
            }}
            seed={[]}
        />
    );
}
