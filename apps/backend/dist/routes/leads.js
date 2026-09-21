"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
const branches_1 = require("../api/branches");
const valkey_1 = require("../cache/valkey");
const keys_1 = require("../cache/keys");
const date_time_1 = require("../utils/date-time");
const statusMap = {
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
const out = (x) => ({
    id: x.id,
    name: x.fullName,
    phone: x.phone,
    email: x.email ?? "",
    source: x.source ?? "",
    status: labels[x.status],
    createdAt: x.createdAt?.toISOString() ?? "",
    nextFollowUpAt: x.nextFollowUpAt?.toISOString() ?? "",
    note: x.note ?? "",
});
exports.leadsRoutes = (0, express_1.Router)();
function validEmail(value) {
    return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function validDate(value) {
    return !value || !!(0, date_time_1.parseDateTime)(value);
}
exports.leadsRoutes.get("/", async (req, res) => {
    try {
        await (0, authorization_1.requirePermission)(req, "lead.read");
        const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
        const rows = await prisma_1.prisma.lead.findMany({
            where: { branchId: { in: ids } },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ data: rows.map(out), cached: false });
    }
    catch (error) {
        const s = error?.status;
        if (s)
            return res.status(s).json({ message: error.message });
        console.error("[leads] list failed", error);
        return res.status(500).json({ message: "Không thể lấy danh sách Lead." });
    }
});
exports.leadsRoutes.post("/", async (req, res) => {
    try {
        const user = await (0, authorization_1.requirePermission)(req, "lead.create");
        const b = req.body ?? {};
        const branchId = await (0, branches_1.defaultBranchId)(req);
        const name = String(b.name ?? "").trim();
        const phone = String(b.phone ?? "").trim();
        const email = String(b.email ?? "")
            .trim()
            .toLowerCase();
        const followUp = String(b.nextFollowUpAt ?? "").trim();
        if (!name || !phone)
            return res.status(400).json({ message: "Họ tên và số điện thoại là bắt buộc." });
        if (!validEmail(email))
            return res.status(400).json({ message: "Email không hợp lệ." });
        if (!validDate(followUp))
            return res.status(400).json({ message: "Ngày follow-up không hợp lệ." });
        const duplicate = await prisma_1.prisma.lead.findFirst({
            where: { branchId, phone },
            select: { id: true },
        });
        if (duplicate)
            return res.status(409).json({ message: "Số điện thoại Lead đã tồn tại." });
        const row = await prisma_1.prisma.lead.create({
            data: {
                branchId,
                fullName: name,
                phone,
                email: email || null,
                source: String(b.source ?? "").trim() || null,
                status: statusMap[String(b.status)] ?? "NEW",
                nextFollowUpAt: followUp ? (0, date_time_1.parseDateTime)(followUp) : null,
                note: String(b.note ?? "").trim() || null,
                createdById: user.id,
                updatedById: user.id,
            },
        });
        await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.leads(branchId));
        return res.status(201).json({ data: out(row) });
    }
    catch (error) {
        const s = error?.status;
        if (s)
            return res.status(s).json({ message: error.message });
        console.error("[leads] create failed", error);
        return res.status(500).json({ message: "Không thể tạo Lead." });
    }
});
exports.leadsRoutes.patch("/", async (req, res) => {
    try {
        const user = await (0, authorization_1.requirePermission)(req, "lead.update");
        const b = req.body ?? {};
        const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
        const existing = await prisma_1.prisma.lead.findFirst({
            where: { id: String(b.id ?? ""), branchId: { in: ids } },
        });
        if (!existing)
            return res.status(404).json({ message: "Không tìm thấy Lead." });
        const name = String(b.name ?? existing.fullName).trim();
        const phone = String(b.phone ?? existing.phone).trim();
        const email = String(b.email ?? existing.email ?? "")
            .trim()
            .toLowerCase();
        const followUp = b.nextFollowUpAt === undefined
            ? (existing.nextFollowUpAt?.toISOString() ?? "")
            : String(b.nextFollowUpAt ?? "").trim();
        if (!name || !phone)
            return res.status(400).json({ message: "Họ tên và số điện thoại là bắt buộc." });
        if (!validEmail(email))
            return res.status(400).json({ message: "Email không hợp lệ." });
        if (!validDate(followUp))
            return res.status(400).json({ message: "Ngày follow-up không hợp lệ." });
        const duplicate = await prisma_1.prisma.lead.findFirst({
            where: { branchId: existing.branchId, phone, id: { not: existing.id } },
            select: { id: true },
        });
        if (duplicate)
            return res.status(409).json({ message: "Số điện thoại Lead đã tồn tại." });
        const row = await prisma_1.prisma.lead.update({
            where: { id: existing.id },
            data: {
                fullName: name,
                phone,
                email: email || null,
                source: String(b.source ?? existing.source ?? "").trim() || null,
                status: statusMap[String(b.status)] ?? existing.status,
                nextFollowUpAt: followUp ? (0, date_time_1.parseDateTime)(followUp) : null,
                note: String(b.note ?? existing.note ?? "").trim() || null,
                updatedById: user.id,
            },
        });
        await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.leads(existing.branchId));
        return res.json({ data: out(row) });
    }
    catch (error) {
        const s = error?.status;
        if (s)
            return res.status(s).json({ message: error.message });
        console.error("[leads] update failed", error);
        return res.status(500).json({ message: "Không thể cập nhật Lead." });
    }
});
exports.leadsRoutes.delete("/", async (req, res) => {
    try {
        await (0, authorization_1.requirePermission)(req, "lead.delete");
        const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
        const row = await prisma_1.prisma.lead.findFirst({
            where: { id: String(req.body?.id ?? ""), branchId: { in: ids } },
            select: { id: true },
        });
        if (!row)
            return res.status(404).json({ message: "Không tìm thấy Lead." });
        await prisma_1.prisma.lead.delete({ where: { id: row.id } });
        await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.leads("all"));
        return res.json({ message: "Đã xóa Lead." });
    }
    catch (error) {
        const s = error?.status;
        if (s)
            return res.status(s).json({ message: error.message });
        console.error("[leads] delete failed", error);
        return res.status(500).json({ message: "Không thể xóa Lead." });
    }
});
