"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
exports.notificationsRoutes = (0, express_1.Router)();
exports.notificationsRoutes.get("/", async (req, res) => {
    try {
        const user = await (0, authorization_1.requireUser)(req);
        const rows = await prisma_1.prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        return res.json({
            data: rows,
            unreadCount: rows.filter((item) => !item.isRead).length,
        });
    }
    catch (error) {
        const status = error?.status;
        if (status)
            return res.status(status).json({ message: error.message });
        return res.status(500).json({ message: "Không thể lấy thông báo." });
    }
});
exports.notificationsRoutes.patch("/:id/read", async (req, res) => {
    try {
        const user = await (0, authorization_1.requireUser)(req);
        const row = await prisma_1.prisma.notification.updateMany({
            where: { id: String(req.params.id), userId: user.id },
            data: { isRead: true },
        });
        return res.json({ data: { updated: row.count } });
    }
    catch (error) {
        const status = error?.status;
        if (status)
            return res.status(status).json({ message: error.message });
        return res.status(500).json({ message: "Không thể cập nhật thông báo." });
    }
});
exports.notificationsRoutes.post("/read-all", async (req, res) => {
    try {
        const user = await (0, authorization_1.requireUser)(req);
        await prisma_1.prisma.notification.updateMany({
            where: { userId: user.id, isRead: false },
            data: { isRead: true },
        });
        return res.json({ message: "Đã đánh dấu tất cả thông báo đã đọc." });
    }
    catch (error) {
        const status = error?.status;
        if (status)
            return res.status(status).json({ message: error.message });
        return res.status(500).json({ message: "Không thể cập nhật thông báo." });
    }
});
