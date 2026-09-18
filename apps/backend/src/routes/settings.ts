import { Router } from "express";
import { prisma } from "../db/prisma";
import { requirePermission, getAccessibleBranchIds } from "../auth/authorization";
import { cacheDelete, cacheGet, cacheSet } from "../cache/valkey";
import { cacheKeys } from "../cache/keys";
import { defaultBranchId } from "../api/branches";
const out = (x: any) => ({ id: x.id, name: x.name, value: x.value, group: x.group });
export const settingsRoutes = Router();
settingsRoutes.get("/", async (req, res) => {
    try {
        await requirePermission(req, "settings.read");
        const ids = await getAccessibleBranchIds(req),
            key = cacheKeys.settings(ids === null ? "all" : ids.sort().join(",") || "none"),
            cached = await cacheGet<any[]>(key);
        if (cached) return res.json({ data: cached, cached: true });
        const rows = await prisma.gymSetting.findMany({
            where: ids === null ? {} : { branchId: { in: ids } },
            orderBy: { name: "asc" },
        });
        const data = rows.map(out);
        await cacheSet(key, data, 120);
        return res.json({ data, cached: false });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        console.error("[settings] list failed", error);
        return res.status(500).json({ message: "Không thể lấy cài đặt." });
    }
});
settingsRoutes.post("/", async (req, res) => {
    try {
        await requirePermission(req, "settings.update");
        const b = req.body ?? {},
            branchId = await defaultBranchId(req),
            name = String(b.name ?? "").trim();
        if (!name) return res.status(400).json({ message: "Tên cài đặt là bắt buộc." });
        const duplicate = await prisma.gymSetting.findFirst({ where: { branchId, name } });
        if (duplicate) return res.status(409).json({ message: "Tên cài đặt đã tồn tại." });
        const row = await prisma.gymSetting.create({
            data: {
                branchId,
                name,
                value: String(b.value ?? "").trim(),
                group: String(b.group ?? "Hệ thống").trim() || "Hệ thống",
            },
        });
        await cacheDelete(cacheKeys.settings("all"));
        return res.status(201).json({ data: out(row) });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        console.error("[settings] create failed", error);
        return res.status(500).json({ message: "Không thể tạo cài đặt." });
    }
});
settingsRoutes.patch("/", async (req, res) => {
    try {
        await requirePermission(req, "settings.update");
        const ids = await getAccessibleBranchIds(req),
            id = String(req.body?.id ?? ""),
            existing = await prisma.gymSetting.findFirst({
                where: { id, ...(ids === null ? {} : { branchId: { in: ids } }) },
            });
        if (!existing) return res.status(404).json({ message: "Không tìm thấy cài đặt." });
        const b = req.body ?? {},
            name = String(b.name ?? existing.name).trim();
        if (!name) return res.status(400).json({ message: "Tên cài đặt là bắt buộc." });
        const duplicate = await prisma.gymSetting.findFirst({
            where: { branchId: existing.branchId, name, id: { not: id } },
        });
        if (duplicate) return res.status(409).json({ message: "Tên cài đặt đã tồn tại." });
        const row = await prisma.gymSetting.update({
            where: { id },
            data: {
                name,
                value: String(b.value ?? existing.value).trim(),
                group: String(b.group ?? existing.group).trim() || "Hệ thống",
            },
        });
        await cacheDelete(cacheKeys.settings("all"));
        return res.json({ data: out(row) });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        console.error("[settings] update failed", error);
        return res.status(500).json({ message: "Không thể cập nhật cài đặt." });
    }
});
settingsRoutes.delete("/", async (req, res) => {
    try {
        await requirePermission(req, "settings.update");
        const ids = await getAccessibleBranchIds(req),
            id = String(req.body?.id ?? ""),
            existing = await prisma.gymSetting.findFirst({
                where: { id, ...(ids === null ? {} : { branchId: { in: ids } }) },
            });
        if (!existing) return res.status(404).json({ message: "Không tìm thấy cài đặt." });
        await prisma.gymSetting.delete({ where: { id } });
        await cacheDelete(cacheKeys.settings("all"));
        return res.json({ message: "Đã xóa cài đặt." });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        console.error("[settings] delete failed", error);
        return res.status(500).json({ message: "Không thể xóa cài đặt." });
    }
});
