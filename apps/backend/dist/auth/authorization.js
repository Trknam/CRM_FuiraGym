"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthError = exports.ROLE_LABELS = void 0;
exports.requireUser = requireUser;
exports.requireRole = requireRole;
exports.requirePermission = requirePermission;
exports.getAccessibleBranchIds = getAccessibleBranchIds;
exports.requireBranchAccess = requireBranchAccess;
exports.assertBranchScope = assertBranchScope;
const session_1 = require("./session");
const branches_1 = require("../api/branches");
var role_labels_1 = require("./role-labels");
Object.defineProperty(exports, "ROLE_LABELS", { enumerable: true, get: function () { return role_labels_1.ROLE_LABELS; } });
const permissions_1 = require("./permissions");
class AuthError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = "AuthError";
    }
}
exports.AuthError = AuthError;
async function requireUser(req) {
    const user = await (0, session_1.getCurrentUser)(req);
    if (!user)
        throw new AuthError(401, "UNAUTHORIZED");
    return user;
}
async function requireRole(req, ...roles) {
    const user = await requireUser(req);
    if (!roles.includes(user.role))
        throw new AuthError(403, "FORBIDDEN");
    return user;
}
async function requirePermission(req, permission) {
    const user = await requireUser(req);
    if (!(0, permissions_1.hasPermission)(user.role, permission))
        throw new AuthError(403, "FORBIDDEN");
    return user;
}
/** Ứng dụng hiện tại chỉ vận hành một cơ sở; branch vẫn giữ trong DB để không phá kiến trúc dữ liệu. */
async function getAccessibleBranchIds(_req) {
    return [await (0, branches_1.getMainBranchId)()];
}
async function requireBranchAccess(req, branchId) {
    await requireUser(req);
    const mainBranchId = await (0, branches_1.getMainBranchId)();
    if (branchId !== mainBranchId)
        throw new AuthError(403, "FORBIDDEN");
    return (0, session_1.getCurrentUser)(req);
}
async function assertBranchScope(req, branchId) {
    return requireBranchAccess(req, branchId);
}
