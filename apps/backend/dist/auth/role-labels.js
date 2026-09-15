"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_LABELS = void 0;
exports.getRoleLabel = getRoleLabel;
exports.ROLE_LABELS = {
    SUPER_ADMIN: "Quản trị hệ thống",
    BRANCH_MANAGER: "Quản lý chi nhánh",
    STAFF: "Nhân viên",
};
function getRoleLabel(role) {
    return exports.ROLE_LABELS[role] ?? "Người dùng";
}
