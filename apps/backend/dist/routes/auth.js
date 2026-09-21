"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const password_1 = require("../auth/password");
const auth_1 = require("../validation/auth");
const session_1 = require("../auth/session");
const permissions_1 = require("../auth/permissions");
exports.authRoutes = (0, express_1.Router)();
exports.authRoutes.post("/login", async (req, res) => {
    try {
        const identifier = String(req.body?.identifier ?? "").trim();
        const password = String(req.body?.password ?? "");
        if (!identifier || !password)
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
        const user = await prisma_1.prisma.user.findFirst({ where: (0, auth_1.isEmail)(identifier) ? { email: identifier.toLowerCase() } : { phone: (0, auth_1.normalizePhone)(identifier) } });
        if (!user || !(await (0, password_1.verifyPassword)(password, user.passwordHash)))
            return res.status(401).json({ message: "Thông tin đăng nhập không chính xác." });
        if (user.approvalStatus === "PENDING")
            return res.status(403).json({ message: "Tài khoản đang chờ quản trị viên phê duyệt." });
        if (user.approvalStatus === "REJECTED")
            return res.status(403).json({ message: "Tài khoản đã bị từ chối." });
        if (!user.isActive)
            return res.status(403).json({ message: "Tài khoản đã bị khóa." });
        await (0, session_1.createSession)(user.id, res);
        return res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, permissions: permissions_1.ROLE_PERMISSIONS[user.role] ?? [] } });
    }
    catch {
        return res.status(500).json({ message: "Không thể đăng nhập lúc này." });
    }
});
exports.authRoutes.post("/register", async (req, res) => {
    try {
        const input = { fullName: String(req.body?.fullName ?? ""), identifier: String(req.body?.identifier ?? ""), password: String(req.body?.password ?? ""), confirmPassword: String(req.body?.confirmPassword ?? "") };
        const errors = (0, auth_1.validateRegister)(input);
        if (Object.keys(errors).length)
            return res.status(400).json({ message: "Dữ liệu đăng ký không hợp lệ.", errors });
        const email = (0, auth_1.isEmail)(input.identifier) ? input.identifier.trim().toLowerCase() : null;
        const phone = email ? null : (0, auth_1.normalizePhone)(input.identifier);
        const existing = await prisma_1.prisma.user.findFirst({ where: { OR: [{ email: email ?? undefined }, { phone: phone ?? undefined }] }, select: { id: true } });
        if (existing)
            return res.status(409).json({ message: "Email hoặc số điện thoại đã được đăng ký." });
        const user = await prisma_1.prisma.user.create({ data: { fullName: input.fullName.trim(), email, phone, passwordHash: await (0, password_1.hashPassword)(input.password), role: "STAFF", isActive: false, approvalStatus: "PENDING" }, select: { id: true, fullName: true, email: true, phone: true, role: true, approvalStatus: true } });
        const branch = await prisma_1.prisma.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
        if (branch)
            await prisma_1.prisma.userBranch.create({ data: { userId: user.id, branchId: branch.id } });
        const admins = await prisma_1.prisma.user.findMany({
            where: { role: "SUPER_ADMIN", isActive: true, approvalStatus: "ACTIVE" },
            select: { id: true },
        });
        if (admins.length) {
            await prisma_1.prisma.notification.createMany({
                data: admins.map((admin) => ({
                    userId: admin.id,
                    type: "ACCOUNT_APPROVAL",
                    title: "Có tài khoản chờ duyệt",
                    message: "Tài khoản " + user.fullName + " vừa đăng ký và đang chờ quản trị viên phê duyệt.",
                    entity: "user",
                    entityId: user.id,
                })),
            });
        }
        await prisma_1.prisma.auditLog.create({
            data: {
                actorUserId: user.id,
                branchId: branch?.id ?? null,
                action: "đã đăng ký tài khoản",
                entity: "user",
                entityId: user.id,
                targetName: user.fullName,
            },
        });
        return res.status(201).json({ user, message: "Đăng ký thành công. Tài khoản đang chờ quản trị viên phê duyệt." });
    }
    catch {
        return res.status(500).json({ message: "Không thể tạo tài khoản lúc này." });
    }
});
exports.authRoutes.post("/logout", async (req, res) => {
    try {
        await (0, session_1.destroySession)(req, res);
        return res.json({ message: "Đã đăng xuất." });
    }
    catch {
        return res.status(500).json({ message: "Không thể đăng xuất." });
    }
});
exports.authRoutes.get("/me", async (req, res) => {
    const user = await (0, session_1.getCurrentUser)(req);
    if (!user) {
        (0, session_1.clearSessionCookie)(res);
        return res.status(401).json({ user: null, message: "UNAUTHORIZED" });
    }
    return res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, permissions: permissions_1.ROLE_PERMISSIONS[user.role] ?? [] } });
});
