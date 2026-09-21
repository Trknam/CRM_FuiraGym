"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
exports.auditRoutes = (0, express_1.Router)();
exports.auditRoutes.get("/", async (req, res) => {
    try {
        await (0, authorization_1.requireRole)(req, "SUPER_ADMIN");
        const rows = await prisma_1.prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
            include: { actor: { select: { fullName: true, email: true, role: true } } },
        });
        return res.json({
            data: rows.map((row) => ({
                id: row.id,
                time: row.createdAt,
                user: row.actor?.fullName ?? "Hệ thống",
                role: row.actor?.role ?? "",
                action: row.action,
                entity: row.entity,
                target: row.targetName ?? "",
                details: row.details ?? "",
            })),
        });
    }
    catch (error) {
        const status = error?.status;
        if (status)
            return res.status(status).json({ message: error.message });
        return res.status(500).json({ message: "Không thể lấy nhật ký Audit." });
    }
});
