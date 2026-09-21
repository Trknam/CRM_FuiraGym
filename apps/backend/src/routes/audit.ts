import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireRole } from "../auth/authorization";

export const auditRoutes = Router();

auditRoutes.get("/", async (req, res) => {
  try {
    await requireRole(req, "SUPER_ADMIN");
    const rows = await prisma.auditLog.findMany({
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
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    return res.status(500).json({ message: "Không thể lấy nhật ký Audit." });
  }
});
