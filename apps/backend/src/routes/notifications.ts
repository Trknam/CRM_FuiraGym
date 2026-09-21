import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireUser } from "../auth/authorization";

export const notificationsRoutes = Router();

notificationsRoutes.get("/", async (req, res) => {
  try {
    const user = await requireUser(req);
    const rows = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return res.json({
      data: rows,
      unreadCount: rows.filter((item) => !item.isRead).length,
    });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    return res.status(500).json({ message: "Không thể lấy thông báo." });
  }
});

notificationsRoutes.patch("/:id/read", async (req, res) => {
  try {
    const user = await requireUser(req);
    const row = await prisma.notification.updateMany({
      where: { id: String(req.params.id), userId: user.id },
      data: { isRead: true },
    });
    return res.json({ data: { updated: row.count } });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    return res.status(500).json({ message: "Không thể cập nhật thông báo." });
  }
});

notificationsRoutes.post("/read-all", async (req, res) => {
  try {
    const user = await requireUser(req);
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return res.json({ message: "Đã đánh dấu tất cả thông báo đã đọc." });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    return res.status(500).json({ message: "Không thể cập nhật thông báo." });
  }
});
