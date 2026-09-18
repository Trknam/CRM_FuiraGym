import { CrudModulePage } from "@/components/modules/crud-module-page";

export default function CrmPage() {
    return (
        <CrudModulePage
            title="CRM chăm sóc"
            description="Theo dõi khách sắp hết hạn, không hoạt động và lịch sử follow-up."
            action="Tạo hoạt động"
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
                    label: "Hoạt động",
                    type: "select",
                    options: ["Gọi điện", "Nhắn tin", "Tư vấn"],
                },
                { key: "note", label: "Nội dung" },
                {
                    key: "status",
                    label: "Trạng thái",
                    type: "select",
                    options: ["Chưa xử lý", "Đã xử lý"],
                },
                { key: "date", label: "Ngày hẹn", type: "date" },
            ]}
            columns={["member", "leadId", "type", "note", "status", "date"]}
            seed={[]}
        />
    );
}
