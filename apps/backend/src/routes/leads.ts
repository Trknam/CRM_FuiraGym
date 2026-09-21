import { Router } from "express";
import { prisma } from "../db/prisma";
import { requirePermission, getAccessibleBranchIds } from "../auth/authorization";
import { defaultBranchId } from "../api/branches";
import { cacheDelete } from "../cache/valkey";
import { cacheKeys } from "../cache/keys";
import { parseDateTime } from "../utils/date-time";

const statusMap: Record<string, "NEW" | "POTENTIAL" | "CONVERTED" | "UNQUALIFIED"> = {
    Mới: "NEW",
    "Tiềm năng": "POTENTIAL",
    "Đã chuyển đổi": "CONVERTED",
    "Không phù hợp": "UNQUALIFIED",
};
const labels = {
    NEW: "Mới",
    POTENTIAL: "Tiềm năng",
    CONVERTED: "Đã chuyển đổi",
    UNQUALIFIED: "Không phù hợp",
};

const out = (x: any) => ({
    id: x.id,
    name: x.fullName,
    phone: x.phone,
    email: x.email ?? "",
    source: x.source ?? "",
    status: labels[x.status as keyof typeof labels],
    createdAt: x.createdAt?.toISOString() ?? "",
    nextFollowUpAt: x.nextFollowUpAt?.toISOString() ?? "",
    note: x.note ?? "",
});

export const leadsRoutes = Router();

function validEmail(value: string) {
    return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validDate(value: string) {
    return !value || !!parseDateTime(value);
}

leadsRoutes.get("/", async (req, res) => {
    try {
        await requirePermission(req, "lead.read");
        const ids = await getAccessibleBranchIds(req);
        const rows = await prisma.lead.findMany({
            where: { branchId: { in: ids } },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ data: rows.map(out), cached: false });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        console.error("[leads] list failed", error);
        return res.status(500).json({ message: "Không thể lấy danh sách Lead." });
    }
});

leadsRoutes.post("/", async (req, res) => {
    try {
        const user = await requirePermission(req, "lead.create");
        const b = req.body ?? {};
        const branchId = await defaultBranchId(req);
        const name = String(b.name ?? "").trim();
        const phone = String(b.phone ?? "").trim();
        const email = String(b.email ?? "")
            .trim()
            .toLowerCase();
        const followUp = String(b.nextFollowUpAt ?? "").trim();
        if (!name || !phone)
            return res.status(400).json({ message: "Họ tên và số điện thoại là bắt buộc." });
        if (!validEmail(email)) return res.status(400).json({ message: "Email không hợp lệ." });
        if (!validDate(followUp))
            return res.status(400).json({ message: "Ngày follow-up không hợp lệ." });
        const duplicate = await prisma.lead.findFirst({
            where: { branchId, phone },
            select: { id: true },
        });
        if (duplicate) return res.status(409).json({ message: "Số điện thoại Lead đã tồn tại." });
        const row = await prisma.lead.create({
            data: {
                branchId,
                fullName: name,
                phone,
                email: email || null,
                source: String(b.source ?? "").trim() || null,
                status: statusMap[String(b.status)] ?? "NEW",
                nextFollowUpAt: followUp ? parseDateTime(followUp) : null,
                note: String(b.note ?? "").trim() || null,
                createdById: user.id,
                updatedById: user.id,
            },
        });
        await cacheDelete(cacheKeys.leads(branchId));
        return res.status(201).json({ data: out(row) });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        console.error("[leads] create failed", error);
        return res.status(500).json({ message: "Không thể tạo Lead." });
    }
});

leadsRoutes.patch("/", async (req, res) => {
    try {
        const user = await requirePermission(req, "lead.update");
        const b = req.body ?? {};
        const ids = await getAccessibleBranchIds(req);
        const existing = await prisma.lead.findFirst({
            where: { id: String(b.id ?? ""), branchId: { in: ids } },
        });
        if (!existing) return res.status(404).json({ message: "Không tìm thấy Lead." });
        const name = String(b.name ?? existing.fullName).trim();
        const phone = String(b.phone ?? existing.phone).trim();
        const email = String(b.email ?? existing.email ?? "")
            .trim()
            .toLowerCase();
        const followUp =
            b.nextFollowUpAt === undefined
                ? (existing.nextFollowUpAt?.toISOString() ?? "")
                : String(b.nextFollowUpAt ?? "").trim();
        if (!name || !phone)
            return res.status(400).json({ message: "Họ tên và số điện thoại là bắt buộc." });
        if (!validEmail(email)) return res.status(400).json({ message: "Email không hợp lệ." });
        if (!validDate(followUp))
            return res.status(400).json({ message: "Ngày follow-up không hợp lệ." });
        const duplicate = await prisma.lead.findFirst({
            where: { branchId: existing.branchId, phone, id: { not: existing.id } },
            select: { id: true },
        });
        if (duplicate) return res.status(409).json({ message: "Số điện thoại Lead đã tồn tại." });
        const row = await prisma.lead.update({
            where: { id: existing.id },
            data: {
                fullName: name,
                phone,
                email: email || null,
                source: String(b.source ?? existing.source ?? "").trim() || null,
                status: statusMap[String(b.status)] ?? existing.status,
                nextFollowUpAt: followUp ? parseDateTime(followUp) : null,
                note: String(b.note ?? existing.note ?? "").trim() || null,
                updatedById: user.id,
            },
        });
        await cacheDelete(cacheKeys.leads(existing.branchId));
        return res.json({ data: out(row) });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        console.error("[leads] update failed", error);
        return res.status(500).json({ message: "Không thể cập nhật Lead." });
    }
});

leadsRoutes.delete("/", async (req, res) => {
    try {
        await requirePermission(req, "lead.delete");
        const ids = await getAccessibleBranchIds(req);
        const row = await prisma.lead.findFirst({
            where: { id: String(req.body?.id ?? ""), branchId: { in: ids } },
            select: { id: true },
        });
        if (!row) return res.status(404).json({ message: "Không tìm thấy Lead." });
        await prisma.lead.delete({ where: { id: row.id } });
        await cacheDelete(cacheKeys.leads("all"));
        return res.json({ message: "Đã xóa Lead." });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        console.error("[leads] delete failed", error);
        return res.status(500).json({ message: "Không thể xóa Lead." });
    }
});
