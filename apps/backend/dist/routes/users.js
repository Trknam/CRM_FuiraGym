"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const password_1 = require("../auth/password");
const authorization_1 = require("../auth/authorization");
const permissions_1 = require("../auth/permissions");
exports.usersRoutes = (0, express_1.Router)();
const MANAGED_ROLES = ["SUPER_ADMIN", "STAFF"];
const ROLE_LABELS = {
    SUPER_ADMIN: "QuÃŸâ•‘Ãºn trÃŸâ•—Ã¯ hÃŸâ•—Ã§ thÃŸâ•—Ã¦ng",
    STAFF: "Nhâ”œÃ³n viâ”œÂ¬n",
};
const PERMISSION_LABELS = {
    "branch.read": "Xem thâ”œâ”¤ng tin phâ”œâ–“ng Gym", "branch.create": "Thâ”œÂ¬m phâ”œâ–“ng Gym", "branch.update": "SÃŸâ•—Â¡a thâ”œâ”¤ng tin phâ”œâ–“ng Gym", "branch.delete": "Xâ”œâ”‚a phâ”œâ–“ng Gym",
    "user.read": "Xem tâ”œÃ¡i khoÃŸâ•‘Ãºn", "user.create": "TÃŸâ•‘Ã­o tâ”œÃ¡i khoÃŸâ•‘Ãºn", "user.update": "SÃŸâ•—Â¡a tâ”œÃ¡i khoÃŸâ•‘Ãºn / phâ”œÃ³n quyÃŸâ•—Ã¼n", "user.delete": "Khâ”œâ”‚a tâ”œÃ¡i khoÃŸâ•‘Ãºn",
    "member.read": "Xem hÃŸâ•—Ã–i viâ”œÂ¬n", "member.create": "Thâ”œÂ¬m hÃŸâ•—Ã–i viâ”œÂ¬n", "member.update": "SÃŸâ•—Â¡a hÃŸâ•—Ã–i viâ”œÂ¬n", "member.delete": "NgÃŸâ•—Â½ng hÃŸâ•—Ã–i viâ”œÂ¬n",
    "lead.read": "Xem Lead", "lead.create": "Thâ”œÂ¬m Lead", "lead.update": "SÃŸâ•—Â¡a Lead", "lead.delete": "Xâ”œâ”‚a Lead",
    "crm.read": "Xem CRM châ”€Ã¢m sâ”œâ”‚c", "crm.create": "TÃŸâ•‘Ã­o hoÃŸâ•‘Ã­t â”€Ã¦ÃŸâ•—Ã–ng CRM", "crm.update": "SÃŸâ•—Â¡a hoÃŸâ•‘Ã­t â”€Ã¦ÃŸâ•—Ã–ng CRM", "crm.delete": "Xâ”œâ”‚a hoÃŸâ•‘Ã­t â”€Ã¦ÃŸâ•—Ã–ng CRM",
    "payment.read": "Xem thanh toâ”œÃ­n", "payment.create": "TÃŸâ•‘Ã­o thanh toâ”œÃ­n", "payment.update": "SÃŸâ•—Â¡a thanh toâ”œÃ­n", "payment.delete": "HÃŸâ•—Âºy / xâ”œâ”‚a thanh toâ”œÃ­n",
    "package.read": "Xem gâ”œâ”‚i tÃŸâ•‘Â¡p", "package.create": "Thâ”œÂ¬m gâ”œâ”‚i tÃŸâ•‘Â¡p", "package.update": "SÃŸâ•—Â¡a gâ”œâ”‚i tÃŸâ•‘Â¡p", "package.delete": "NgÃŸâ•—Â½ng gâ”œâ”‚i tÃŸâ•‘Â¡p",
    "checkin.read": "Xem Check-in", "checkin.create": "TÃŸâ•‘Ã­o Check-in", "checkin.update": "SÃŸâ•—Â¡a Check-in", "checkin.delete": "Xâ”œâ”‚a Check-in",
    "trainer.read": "Xem PT / Trainer", "trainer.create": "Thâ”œÂ¬m PT / Trainer", "trainer.update": "SÃŸâ•—Â¡a PT / Trainer", "trainer.delete": "Xâ”œâ”‚a PT / Trainer",
    "exercise.read": "Xem Exercise Database", "exercise.create": "Thâ”œÂ¬m bâ”œÃ¡i tÃŸâ•‘Â¡p", "exercise.update": "SÃŸâ•—Â¡a bâ”œÃ¡i tÃŸâ•‘Â¡p", "exercise.delete": "Xâ”œâ”‚a bâ”œÃ¡i tÃŸâ•‘Â¡p",
    "workout.read": "Xem giâ”œÃ­o â”œÃ­n", "workout.generate": "TÃŸâ•‘Ã­o giâ”œÃ­o â”œÃ­n AI", "report.read": "Xem bâ”œÃ­o câ”œÃ­o",
    "settings.read": "Xem câ”œÃ¡i â”€Ã¦ÃŸâ•‘â•–t", "settings.update": "SÃŸâ•—Â¡a câ”œÃ¡i â”€Ã¦ÃŸâ•‘â•–t",
};
function managedRole(value) {
    return MANAGED_ROLES.includes(value) ? value : null;
}
function mapUser(user) {
    const role = managedRole(user.role) ?? "STAFF";
    return { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role, roleLabel: ROLE_LABELS[role], isActive: user.isActive, createdAt: user.createdAt };
}
exports.usersRoutes.get("/", async (req, res) => {
    try {
        await (0, authorization_1.requireRole)(req, "SUPER_ADMIN");
        const users = await prisma_1.prisma.user.findMany({ where: { role: { in: MANAGED_ROLES } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }], select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true, createdAt: true } });
        return res.json({ data: users.map(mapUser) });
    }
    catch (error) {
        const status = error?.status;
        if (status)
            return res.status(status).json({ message: error.message });
        console.error("[users] list failed", error);
        return res.status(500).json({ message: "Khâ”œâ”¤ng thÃŸâ•—Ã¢ lÃŸâ•‘Ã‘y danh sâ”œÃ­ch tâ”œÃ¡i khoÃŸâ•‘Ãºn." });
    }
});
exports.usersRoutes.get("/permissions", async (req, res) => {
    try {
        await (0, authorization_1.requireRole)(req, "SUPER_ADMIN");
        return res.json({ roles: MANAGED_ROLES.map((role) => ({ role, label: ROLE_LABELS[role], permissions: permissions_1.ROLE_PERMISSIONS[role].map((permission) => ({ key: permission, label: PERMISSION_LABELS[permission] })) })) });
    }
    catch (error) {
        const status = error?.status;
        if (status)
            return res.status(status).json({ message: error.message });
        return res.status(500).json({ message: "Khâ”œâ”¤ng thÃŸâ•—Ã¢ lÃŸâ•‘Ã‘y cÃŸâ•‘Ã‘u hâ”œÂ¼nh quyÃŸâ•—Ã¼n." });
    }
});
exports.usersRoutes.post("/", async (req, res) => {
    try {
        await (0, authorization_1.requireRole)(req, "SUPER_ADMIN");
        const fullName = String(req.body?.fullName ?? "").trim();
        const identifier = String(req.body?.identifier ?? "").trim();
        const password = String(req.body?.password ?? "");
        const role = managedRole(req.body?.role) ?? "STAFF";
        if (!fullName || !identifier || password.length < 8)
            return res.status(400).json({ message: "HÃŸâ•—Ã¬ tâ”œÂ¬n, tâ”œÃ¡i khoÃŸâ•‘Ãºn vâ”œÃ¡ mÃŸâ•‘Â¡t khÃŸâ•‘âŒu tÃŸâ•—Ã¦i thiÃŸâ•—Ã¢u 8 kâ”œâ•œ tÃŸâ•—â–’ lâ”œÃ¡ bÃŸâ•‘Â»t buÃŸâ•—Ã–c." });
        const email = identifier.includes("@") ? identifier.toLowerCase() : null;
        const phone = email ? null : identifier.replace(/\D/g, "");
        if (!email && (!phone || phone.length < 9))
            return res.status(400).json({ message: "Email hoÃŸâ•‘â•–c sÃŸâ•—Ã¦ â”€Ã¦iÃŸâ•—Ã§n thoÃŸâ•‘Ã­i khâ”œâ”¤ng hÃŸâ•—Ãºp lÃŸâ•—Ã§." });
        const duplicate = await prisma_1.prisma.user.findFirst({ where: { OR: [{ email: email ?? undefined }, { phone: phone ?? undefined }] }, select: { id: true } });
        if (duplicate)
            return res.status(409).json({ message: "Email hoÃŸâ•‘â•–c sÃŸâ•—Ã¦ â”€Ã¦iÃŸâ•—Ã§n thoÃŸâ•‘Ã­i â”€Ã¦â”œÃº tÃŸâ•—Ã´n tÃŸâ•‘Ã­i." });
        const user = await prisma_1.prisma.user.create({ data: { fullName, email, phone, passwordHash: await (0, password_1.hashPassword)(password), role, isActive: true }, select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true, createdAt: true } });
        return res.status(201).json({ data: mapUser(user) });
    }
    catch (error) {
        const status = error?.status;
        if (status)
            return res.status(status).json({ message: error.message });
        console.error("[users] create failed", error);
        return res.status(500).json({ message: "Khâ”œâ”¤ng thÃŸâ•—Ã¢ tÃŸâ•‘Ã­o tâ”œÃ¡i khoÃŸâ•‘Ãºn." });
    }
});
exports.usersRoutes.patch("/", async (req, res) => {
    try {
        const current = await (0, authorization_1.requireRole)(req, "SUPER_ADMIN");
        const id = String(req.body?.id ?? "");
        if (!id)
            return res.status(400).json({ message: "ThiÃŸâ•‘â”u mâ”œÃº tâ”œÃ¡i khoÃŸâ•‘Ãºn." });
        const existing = await prisma_1.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
        if (!existing || !MANAGED_ROLES.includes(existing.role))
            return res.status(404).json({ message: "Khâ”œâ”¤ng tâ”œÂ¼m thÃŸâ•‘Ã‘y tâ”œÃ¡i khoÃŸâ•‘Ãºn." });
        const nextRole = req.body?.role === undefined ? managedRole(existing.role) : managedRole(req.body.role);
        const data = {};
        if (nextRole)
            data.role = nextRole;
        if (typeof req.body?.isActive === "boolean")
            data.isActive = req.body.isActive;
        if (req.body?.password !== undefined) {
            const password = String(req.body.password);
            if (password.length < 8)
                return res.status(400).json({ message: "MÃŸâ•‘Â¡t khÃŸâ•‘âŒu phÃŸâ•‘Ãºi câ”œâ”‚ â”œÂ¡t nhÃŸâ•‘Ã‘t 8 kâ”œâ•œ tÃŸâ•—â–’." });
            data.passwordHash = await (0, password_1.hashPassword)(password);
        }
        if (id === current.id && data.isActive === false)
            return res.status(400).json({ message: "Khâ”œâ”¤ng thÃŸâ•—Ã¢ khâ”œâ”‚a tâ”œÃ¡i khoÃŸâ•‘Ãºn â”€Ã¦ang â”€Ã¦â”€Ã¢ng nhÃŸâ•‘Â¡p." });
        if (id === current.id && data.role && data.role !== "SUPER_ADMIN")
            return res.status(400).json({ message: "Khâ”œâ”¤ng thÃŸâ•—Ã¢ hÃŸâ•‘Ã­ quyÃŸâ•—Ã¼n tâ”œÃ¡i khoÃŸâ•‘Ãºn quÃŸâ•‘Ãºn trÃŸâ•—Ã¯ â”€Ã¦ang â”€Ã¦â”€Ã¢ng nhÃŸâ•‘Â¡p." });
        if (existing.role === "SUPER_ADMIN" && data.isActive === false) {
            const activeAdmins = await prisma_1.prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true } });
            if (activeAdmins <= 1)
                return res.status(400).json({ message: "PhÃŸâ•‘Ãºi giÃŸâ•—Â» lÃŸâ•‘Ã­i â”œÂ¡t nhÃŸâ•‘Ã‘t mÃŸâ•—Ã–t tâ”œÃ¡i khoÃŸâ•‘Ãºn quÃŸâ•‘Ãºn trÃŸâ•—Ã¯ hoÃŸâ•‘Ã­t â”€Ã¦ÃŸâ•—Ã–ng." });
        }
        const user = await prisma_1.prisma.user.update({ where: { id }, data, select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true, createdAt: true } });
        return res.json({ data: mapUser(user) });
    }
    catch (error) {
        const status = error?.status;
        if (status)
            return res.status(status).json({ message: error.message });
        console.error("[users] update failed", error);
        return res.status(500).json({ message: "Khâ”œâ”¤ng thÃŸâ•—Ã¢ cÃŸâ•‘Â¡p nhÃŸâ•‘Â¡t tâ”œÃ¡i khoÃŸâ•‘Ãºn." });
    }
});
exports.usersRoutes.delete("/", async (req, res) => {
    try {
        const current = await (0, authorization_1.requireRole)(req, "SUPER_ADMIN");
        const id = String(req.body?.id ?? req.query?.id ?? "");
        if (!id)
            return res.status(400).json({ message: "ThiÃŸâ•‘â”u mâ”œÃº tâ”œÃ¡i khoÃŸâ•‘Ãºn." });
        if (id === current.id)
            return res.status(400).json({ message: "Khâ”œâ”¤ng thÃŸâ•—Ã¢ khâ”œâ”‚a tâ”œÃ¡i khoÃŸâ•‘Ãºn â”€Ã¦ang â”€Ã¦â”€Ã¢ng nhÃŸâ•‘Â¡p." });
        const existing = await prisma_1.prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true } });
        if (!existing || !MANAGED_ROLES.includes(existing.role))
            return res.status(404).json({ message: "Khâ”œâ”¤ng tâ”œÂ¼m thÃŸâ•‘Ã‘y tâ”œÃ¡i khoÃŸâ•‘Ãºn." });
        if (existing.role === "SUPER_ADMIN" && existing.isActive) {
            const activeAdmins = await prisma_1.prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true } });
            if (activeAdmins <= 1)
                return res.status(400).json({ message: "PhÃŸâ•‘Ãºi giÃŸâ•—Â» lÃŸâ•‘Ã­i â”œÂ¡t nhÃŸâ•‘Ã‘t mÃŸâ•—Ã–t tâ”œÃ¡i khoÃŸâ•‘Ãºn quÃŸâ•‘Ãºn trÃŸâ•—Ã¯ hoÃŸâ•‘Ã­t â”€Ã¦ÃŸâ•—Ã–ng." });
        }
        await prisma_1.prisma.user.update({ where: { id }, data: { isActive: false } });
        return res.json({ message: "â”€Ã‰â”œÃº khâ”œâ”‚a tâ”œÃ¡i khoÃŸâ•‘Ãºn." });
    }
    catch (error) {
        const status = error?.status;
        if (status)
            return res.status(status).json({ message: error.message });
        console.error("[users] delete failed", error);
        return res.status(500).json({ message: "Khâ”œâ”¤ng thÃŸâ•—Ã¢ khâ”œâ”‚a tâ”œÃ¡i khoÃŸâ•‘Ãºn." });
    }
});
