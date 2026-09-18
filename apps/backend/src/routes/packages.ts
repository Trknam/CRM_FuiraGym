import { Router } from "express";
import { prisma } from "../db/prisma";
import { requirePermission, getAccessibleBranchIds } from "../auth/authorization";
import { cacheDelete, cacheGet, cacheSet } from "../cache/valkey";
import { cacheKeys } from "../cache/keys";
import { defaultBranchId } from "../api/branches";

export const packagesRoutes = Router();
const label = (s: string) => (s === "ACTIVE" ? "Đang bán" : "Tạm dừng");
const map = (x: any) => ({
    id: x.id,
    name: x.name,
    duration: Math.round(x.durationDays / 30),
    price: Number(x.price),
    status: label(x.status),
});

packagesRoutes.get("/", async (req, res) => {
    try {
        await requirePermission(req, "package.read");
        const ids = await getAccessibleBranchIds(req);
        const scope = ids === null ? "all" : ids.sort().join(",") || "none";
        const status = String(req.query.status ?? "all");
        const key = cacheKeys.packages(scope, status);
        const cached = await cacheGet<unknown[]>(key);
        if (cached) return res.json({ data: cached, cached: true });
        const rows = await prisma.gymPackage.findMany({
            where: {
                ...(ids === null ? {} : { branchId: { in: ids } }),
                ...(status === "ACTIVE" || status === "INACTIVE" ? { status } : {}),
            },
            orderBy: { createdAt: "desc" },
        });
        const data = rows.map(map);
        await cacheSet(key, data, 60);
        return res.json({ data, cached: false });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        return res.status(500).json({ message: "Không thể lấy danh sách gói tập." });
    }
});

packagesRoutes.post("/", async (req, res) => {
    try {
        await requirePermission(req, "package.create");
        const b = req.body ?? {};
        const ids = await getAccessibleBranchIds(req);
        const branchId = await defaultBranchId(req);
        const duration = Number(b.duration);
        const price = Number(b.price);
        if (
            !branchId ||
            !String(b.name ?? "").trim() ||
            !Number.isInteger(duration) ||
            duration <= 0 ||
            !Number.isFinite(price) ||
            price < 0
        )
            return res.status(400).json({ message: "Thông tin gói tập không hợp lệ." });
        if (ids !== null && !ids.includes(branchId))
            return res.status(403).json({ message: "Bạn không có quyền tại chi nhánh này." });
        const count = await prisma.gymPackage.count({ where: { branchId } });
        const row = await prisma.gymPackage.create({
            data: {
                branchId,
                code: `PKG-${String(count + 1).padStart(4, "0")}`,
                name: String(b.name).trim(),
                durationDays: duration * 30,
                price,
                status: b.status === "Tạm dừng" ? "INACTIVE" : "ACTIVE",
            },
        });
        await cacheDelete(cacheKeys.packages("all", "all"));
        await cacheDelete(cacheKeys.packages(branchId, "all"));
        await cacheDelete(cacheKeys.packages(branchId, "ACTIVE"));
        await cacheDelete(cacheKeys.packages(branchId, "INACTIVE"));
        return res.status(201).json({ data: map(row) });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        return res.status(500).json({ message: "Không thể tạo gói tập." });
    }
});

packagesRoutes.patch("/", async (req, res) => {
    try {
        await requirePermission(req, "package.update");
        const b = req.body ?? {};
        const ids = await getAccessibleBranchIds(req);
        const existing = await prisma.gymPackage.findFirst({
            where: { id: String(b.id), ...(ids === null ? {} : { branchId: { in: ids } }) },
        });
        if (!existing) return res.status(404).json({ message: "Không tìm thấy gói tập." });
        const duration = Number(b.duration ?? existing.durationDays / 30);
        const price = Number(b.price ?? existing.price);
        if (
            !String(b.name ?? existing.name).trim() ||
            !Number.isInteger(duration) ||
            duration <= 0 ||
            !Number.isFinite(price) ||
            price < 0
        )
            return res.status(400).json({ message: "Thông tin gói tập không hợp lệ." });
        const row = await prisma.gymPackage.update({
            where: { id: existing.id },
            data: {
                name: String(b.name ?? existing.name).trim(),
                durationDays: duration * 30,
                price,
                status: b.status === "Tạm dừng" ? "INACTIVE" : "ACTIVE",
            },
        });
        await cacheDelete(cacheKeys.packages("all", "all"));
        await cacheDelete(cacheKeys.packages(existing.branchId, "all"));
        await cacheDelete(cacheKeys.packages(existing.branchId, "ACTIVE"));
        await cacheDelete(cacheKeys.packages(existing.branchId, "INACTIVE"));
        return res.json({ data: map(row) });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        return res.status(500).json({ message: "Không thể cập nhật gói tập." });
    }
});

packagesRoutes.delete("/", async (req, res) => {
    try {
        await requirePermission(req, "package.delete");
        const ids = await getAccessibleBranchIds(req);
        const packageIds: string[] = Array.from(new Set<string>(Array.isArray(req.body?.ids) ? req.body.ids.map((value: unknown) => String(value).trim()).filter(Boolean) : [String(req.body?.id ?? "").trim()].filter(Boolean)));
        if (packageIds.length === 0) return res.status(400).json({ message: "Chưa chọn gói tập." });
        const existing = await prisma.gymPackage.findMany({
            where: { id: { in: packageIds }, ...(ids === null ? {} : { branchId: { in: ids } }) },
        });
        if (existing.length === 0) return res.status(404).json({ message: "Không tìm thấy gói tập." });
        await prisma.gymPackage.updateMany({ where: { id: { in: existing.map((item) => item.id) } }, data: { status: "INACTIVE" } });
        const updated = await prisma.gymPackage.findMany({ where: { id: { in: existing.map((item) => item.id) } } });
        await cacheDelete(cacheKeys.packages("all", "all"));
        for (const branchId of Array.from(new Set(existing.map((item) => item.branchId)))) {
            await cacheDelete(cacheKeys.packages(branchId, "all"));
            await cacheDelete(cacheKeys.packages(branchId, "ACTIVE"));
            await cacheDelete(cacheKeys.packages(branchId, "INACTIVE"));
        }
        return res.json({ message: "Đã tạm dừng gói tập.", data: updated.map(map) });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        return res.status(500).json({ message: "Không thể xóa gói tập." });
    }
});
