import { CrudModulePage } from "@/components/modules/crud-module-page";

export default function MembersPage() {
  return <CrudModulePage title="Hội viên" description="Quản lý hồ sơ, trạng thái và lịch sử hội viên." action="Thêm hội viên" moduleKey="members" fields={[
    {key:"name",label:"Họ và tên",required:true},
    {key:"phone",label:"Số điện thoại",required:true},
    {key:"email",label:"Email"},
    {key:"dateOfBirth",label:"Ngày sinh",type:"date"},
    {key:"address",label:"Địa chỉ"},
    {key:"packageId",label:"Gói tập",type:"select",optionsEndpoint:"/api/packages?status=ACTIVE"},
    {key:"memberStatus",label:"Trạng thái hội viên",type:"select",options:["Đang hoạt động","Tạm nghỉ","Bị khóa"],required:true},
    {key:"membershipStatus",label:"Trạng thái gói",type:"select",options:["Đang hoạt động","Hết hạn","Đã hủy"]},
    {key:"startDate",label:"Ngày bắt đầu",type:"date"},
    {key:"endDate",label:"Ngày hết hạn",type:"date"}
  ]} columns={["memberCode","name","phone","package","membershipStatus","memberStatus","endDate"]} columnLabels={{memberCode:"Mã hội viên",package:"Gói tập",membershipStatus:"Trạng thái gói",memberStatus:"Trạng thái hội viên",endDate:"Ngày hết hạn"}} seed={[]}/>;
}
