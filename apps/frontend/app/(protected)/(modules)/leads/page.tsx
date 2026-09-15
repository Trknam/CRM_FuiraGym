import { CrudModulePage } from "@/components/modules/crud-module-page";

export default function LeadsPage() {
  return <CrudModulePage
    title="Leads"
    description="Theo dõi khách tiềm năng từ lúc tư vấn đến khi chuyển đổi."
    action="Thêm Lead"
    moduleKey="leads"
    fields={[
      { key: "name", label: "Họ và tên", required: true },
      { key: "phone", label: "Số điện thoại", required: true },
      { key: "email", label: "Email", type: "text" },
      { key: "source", label: "Nguồn" },
      { key: "status", label: "Trạng thái", type: "select", options: ["Mới", "Tiềm năng", "Đã chuyển đổi", "Không phù hợp"] },
      { key: "nextFollowUpAt", label: "Ngày follow-up", type: "datetime-local" },
      { key: "note", label: "Ghi chú" },
    ]}
    columns={["name", "phone", "email", "source", "status", "nextFollowUpAt", "note"]}
    columnLabels={{ name: "Họ và tên", phone: "Số điện thoại", email: "Email", source: "Nguồn", status: "Trạng thái", nextFollowUpAt: "Ngày follow-up", note: "Ghi chú" }}
    seed={[]}
  />;
}
