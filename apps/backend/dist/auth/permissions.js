"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = void 0;
exports.hasPermission = hasPermission;
exports.ROLE_PERMISSIONS = {
    SUPER_ADMIN: [
        "branch.read", "branch.create", "branch.update", "branch.delete", "user.read", "user.create", "user.update", "user.delete",
        "member.read", "member.create", "member.update", "member.delete", "lead.read", "lead.create", "lead.update", "lead.delete",
        "crm.read", "crm.create", "crm.update", "crm.delete", "payment.read", "payment.create", "payment.update", "payment.delete",
        "package.read", "package.create", "package.update", "package.delete", "checkin.read", "checkin.create", "checkin.update", "checkin.delete",
        "trainer.read", "trainer.create", "trainer.update", "trainer.delete", "exercise.read", "exercise.create", "exercise.update", "exercise.delete",
        "workout.read", "workout.generate", "report.read", "settings.read", "settings.update",
    ],
    BRANCH_MANAGER: [
        "branch.read", "branch.update", "user.read", "user.create", "user.update",
        "member.read", "member.create", "member.update", "member.delete", "lead.read", "lead.create", "lead.update", "lead.delete",
        "crm.read", "crm.create", "crm.update", "crm.delete", "payment.read", "payment.create", "payment.update", "payment.delete",
        "package.read", "package.create", "package.update", "package.delete", "checkin.read", "checkin.create", "checkin.update", "checkin.delete",
        "trainer.read", "trainer.create", "trainer.update", "trainer.delete", "exercise.read", "exercise.create", "exercise.update", "exercise.delete",
        "workout.read", "workout.generate", "report.read", "settings.read",
    ],
    STAFF: [
        "branch.read",
        "member.read", "member.create", "member.update", "member.delete",
        "lead.read", "lead.create", "lead.update", "lead.delete",
        "crm.read", "crm.create", "crm.update", "crm.delete",
        "payment.read", "payment.create", "payment.update", "payment.delete",
        "package.read", "package.create", "package.update", "package.delete",
        "checkin.read", "checkin.create", "checkin.update", "checkin.delete",
        "trainer.read", "trainer.create", "trainer.update", "trainer.delete",
        "exercise.read", "exercise.create", "exercise.update", "exercise.delete",
        "workout.read", "workout.generate", "report.read",
    ],
};
function hasPermission(role, permission) {
    return exports.ROLE_PERMISSIONS[role].includes(permission);
}
