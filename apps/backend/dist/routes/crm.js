"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crmRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
const valkey_1 = require("../cache/valkey");
const keys_1 = require("../cache/keys");
const activity_1 = require("../services/activity");
const typeMap = { "Gọi điện": "CALL", "Nhắn tin": "MESSAGE", "Tư vấn": "CONSULTATION", "Follow-up": "FOLLOW_UP", "Hẹn gặp": "APPOINTMENT", "Ghi chú chăm sóc": "NOTE" };
const typeLabel = { CALL: "Gọi điện", MESSAGE: "Nhắn tin", CONSULTATION: "Tư vấn", FOLLOW_UP: "Follow-up", APPOINTMENT: "Hẹn gặp", NOTE: "Ghi chú chăm sóc" };
const statusMap = { "Chưa xử lý": "PENDING", "Đã xử lý": "DONE" };
const statusLabel = { PENDING: "Chưa xử lý", DONE: "Đã xử lý" };
const include = { member: true, lead: true, createdBy: { select: { id: true, fullName: true, email: true } } };
const out = (x) => ({ id: x.id, member: x.member?.fullName ?? "", lead: x.lead?.fullName ?? "", memberId: x.memberId ?? "", leadId: x.leadId ?? "", type: typeLabel[x.type], note: x.note ?? "", status: statusLabel[x.status], date: x.scheduledAt?.toISOString() ?? "", createdBy: x.createdBy?.fullName ?? "—" });
exports.crmRoutes = (0, express_1.Router)();
exports.crmRoutes.get("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "crm.read");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const rows = await prisma_1.prisma.crmActivity.findMany({ where: { branchId: { in: ids } }, include, orderBy: { createdAt: "desc" } });
    return res.json({ data: rows.map(out), cached: false });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    return res.status(500).json({ message: "Không thể lấy lịch sử chăm sóc CRM." });
} });
exports.crmRoutes.post("/", async (req, res) => { try {
    const user = await (0, authorization_1.requirePermission)(req, "crm.create"), b = req.body ?? {};
    const memberId = String(b.memberId ?? "").trim() || null, leadId = String(b.leadId ?? "").trim() || null;
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const member = memberId ? await prisma_1.prisma.member.findFirst({ where: { id: memberId, ...(ids === null ? {} : { branchId: { in: ids } }) } }) : null;
    const lead = leadId ? await prisma_1.prisma.lead.findFirst({ where: { id: leadId, ...(ids === null ? {} : { branchId: { in: ids } }) } }) : null;
    if (memberId && !member)
        return res.status(404).json({ message: "Không tìm thấy hội viên hoặc hội viên không thuộc phạm vi truy cập." });
    if (leadId && !lead)
        return res.status(404).json({ message: "Không tìm thấy Lead hoặc Lead không thuộc phạm vi truy cập." });
    if (!member && !lead)
        return res.status(400).json({ message: "Phải chọn hội viên hoặc Lead hợp lệ." });
    if (member && lead && member.branchId !== lead.branchId)
        return res.status(400).json({ message: "Hội viên và Lead phải thuộc cùng một chi nhánh." });
    const branchId = member?.branchId ?? lead?.branchId;
    if (!branchId)
        return res.status(400).json({ message: "Không xác định được chi nhánh của hoạt động CRM." });
    const row = await prisma_1.prisma.crmActivity.create({ data: { branchId, memberId: member?.id, leadId: lead?.id, createdById: user.id, type: typeMap[String(b.type)] ?? "CALL", note: String(b.note ?? "").trim() || null, status: statusMap[String(b.status)] ?? "PENDING", scheduledAt: b.date ? new Date(b.date) : null }, include });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.crm("all"));
    if (member)
        await (0, activity_1.recordActivity)({ req, action: "đã tạo hoạt động CRM", entity: "crm", entityId: row.id, targetName: member.fullName, branchId });
    return res.status(201).json({ data: out(row) });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    console.error("[crm] create failed", error);
    return res.status(500).json({ message: "Không thể tạo hoạt động CRM." });
} });
exports.crmRoutes.patch("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "crm.update");
    const b = req.body ?? {}, ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const existing = await prisma_1.prisma.crmActivity.findFirst({ where: { id: String(b.id), ...(ids === null ? {} : { branchId: { in: ids } }) }, include });
    if (!existing)
        return res.status(404).json({ message: "Không tìm thấy hoạt động CRM." });
    const row = await prisma_1.prisma.crmActivity.update({ where: { id: existing.id }, data: { type: typeMap[String(b.type)] ?? existing.type, note: String(b.note ?? "").trim() || null, status: statusMap[String(b.status)] ?? existing.status, scheduledAt: b.date ? new Date(b.date) : null }, include });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.crm("all"));
    if (existing.member)
        await (0, activity_1.recordActivity)({ req, action: "đã cập nhật hoạt động CRM", entity: "crm", entityId: row.id, targetName: existing.member.fullName, branchId: existing.branchId });
    return res.json({ data: out(row) });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    console.error("[crm] update failed", error);
    return res.status(500).json({ message: "Không thể cập nhật hoạt động CRM." });
} });
exports.crmRoutes.delete("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "crm.delete");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const existing = await prisma_1.prisma.crmActivity.findFirst({ where: { id: String(req.body?.id), ...(ids === null ? {} : { branchId: { in: ids } }) }, include });
    if (!existing)
        return res.status(404).json({ message: "Không tìm thấy hoạt động CRM." });
    await prisma_1.prisma.crmActivity.delete({ where: { id: existing.id } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.crm("all"));
    if (existing.member)
        await (0, activity_1.recordActivity)({ req, action: "đã xóa hoạt động CRM", entity: "crm", entityId: existing.id, targetName: existing.member.fullName, branchId: existing.branchId });
    return res.json({ message: "Đã xóa hoạt động CRM." });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    console.error("[crm] delete failed", error);
    return res.status(500).json({ message: "Không thể xóa hoạt động CRM." });
} });
