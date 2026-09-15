import type { AppRole } from "./authorization";

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Quản trị hệ thống",
  BRANCH_MANAGER: "Quản lý chi nhánh",
  STAFF: "Nhân viên",
};

export function getRoleLabel(role: AppRole): string {
  return ROLE_LABELS[role] ?? "Người dùng";
}
