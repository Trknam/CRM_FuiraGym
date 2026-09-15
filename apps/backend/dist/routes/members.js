"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.membersRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const valkey_1 = require("../cache/valkey");
const keys_1 = require("../cache/keys");
const authorization_1 = require("../auth/authorization");
const branches_1 = require("../api/branches");
exports.membersRoutes = (0, express_1.Router)();
function mapMember(member) {
    const membership = member.memberships?.[0];
    return {
        id: member.id,
        memberCode: member.memberCode,
        name: member.fullName,
        phone: member.phone,
        email: member.email ?? "",
        packageId: membership?.packageId ?? "",
        package: membership?.package?.name ?? "Chưa có gói",
        status: member.status === "ACTIVE" ? "Đang hoạt động" : member.status === "BLOCKED" ? "Bị khóa" : "Tạm nghỉ",
        memberStatus: member.status === "ACTIVE" ? "Đang hoạt động" : member.status === "BLOCKED" ? "Bị khóa" : "Tạm nghỉ",
        membershipStatus: membership?.status === "ACTIVE" ? "Đang hoạt động" : membership?.status === "EXPIRED" ? "Hết hạn" : membership?.status === "CANCELLED" ? "Đã hủy" : "",
        startDate: membership?.startDate?.toISOString().slice(0, 10) ?? "",
        endDate: membership?.endDate?.toISOString().slice(0, 10) ?? "",
        expiry: membership?.endDate?.toISOString().slice(0, 10) ?? "",
    };
}
function memberStatus(value, fallback) {
    const text = String(value ?? "").trim().toUpperCase();
    if (text === "ĐANG HOẠT ĐỘNG" || text === "ACTIVE")
        return "ACTIVE";
    if (text === "TẠM NGHỈ" || text === "INACTIVE")
        return "INACTIVE";
    if (text === "BỊ KHÓA" || text === "BLOCKED")
        return "BLOCKED";
    return fallback;
}
function membershipStatus(value, fallback) {
    const text = String(value ?? "").trim().toUpperCase();
    if (text === "ĐANG HOẠT ĐỘNG" || text === "ACTIVE")
        return "ACTIVE";
    if (text === "HẾT HẠN" || text === "EXPIRED")
        return "EXPIRED";
    if (text === "ĐÃ HỦY" || text === "CANCELLED")
        return "CANCELLED";
    return fallback;
}
function parseDate(value, fallback) {
    if (value === undefined || value === null || String(value).trim() === "")
        return fallback ?? null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
}
async function invalidate(branchId) {
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.members(branchId));
}
exports.membersRoutes.get("/", async (req, res) => {
    try {
        await (0, authorization_1.requirePermission)(req, "member.read");
        const branchId = await (0, branches_1.defaultBranchId)(req);
        const key = keys_1.cacheKeys.members(branchId);
        const cached = await (0, valkey_1.cacheGet)(key);
        if (cached)
            return res.json({ data: cached, cached: true });
        const members = await prisma_1.prisma.member.findMany({
            where: { branchId },
            orderBy: { createdAt: "desc" },
            include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } },
        });
        const data = members.map(mapMember);
        await (0, valkey_1.cacheSet)(key, data, 60);
        return res.json({ data, cached: false });
    }
    catch (error) {
        console.error("[members] list failed", error);
        if (error instanceof Error && "status" in error)
            return res.status(Number(error.status)).json({ message: error.message });
        return res.status(500).json({ message: "Không thể lấy danh sách hội viên." });
    }
});
exports.membersRoutes.post("/", async (req, res) => {
    try {
        await (0, authorization_1.requirePermission)(req, "member.create");
        const body = req.body ?? {};
        const branchId = await (0, branches_1.defaultBranchId)(req);
        const fullName = String(body.name ?? "").trim();
        const phone = String(body.phone ?? "").trim();
        const email = String(body.email ?? "").trim() || null;
        if (!fullName || !phone)
            return res.status(400).json({ message: "Họ tên và số điện thoại là bắt buộc." });
        if (email && !/^\S+@\S+\.\S+$/.test(email))
            return res.status(400).json({ message: "Email không hợp lệ." });
        const duplicate = await prisma_1.prisma.member.findFirst({ where: { phone, branchId } });
        if (duplicate)
            return res.status(409).json({ message: "Số điện thoại hội viên đã tồn tại." });
        const count = await prisma_1.prisma.member.count({ where: { branchId } });
        const member = await prisma_1.prisma.$transaction(async (tx) => {
            const created = await tx.member.create({
                data: { branchId, memberCode: `MB-${String(count + 1).padStart(5, "0")}`, fullName, phone, email, dateOfBirth: parseDate(body.dateOfBirth), address: String(body.address ?? "").trim() || null, status: memberStatus(body.memberStatus, "ACTIVE") },
            });
            const packageId = String(body.packageId ?? "").trim();
            if (packageId) {
                const pkg = await tx.gymPackage.findFirst({ where: { id: packageId, branchId, status: "ACTIVE" } });
                if (!pkg)
                    throw new Error("INVALID_PACKAGE");
                const startDate = parseDate(body.startDate, new Date()) ?? new Date();
                const endDate = parseDate(body.endDate) ?? new Date(startDate.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
                if (endDate <= startDate)
                    throw new Error("INVALID_MEMBERSHIP_DATES");
                await tx.membership.create({ data: { memberId: created.id, packageId: pkg.id, startDate, endDate, price: pkg.price, status: membershipStatus(body.membershipStatus, "ACTIVE") } });
            }
            return tx.member.findUniqueOrThrow({ where: { id: created.id }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } } });
        });
        await invalidate(branchId);
        return res.status(201).json({ data: mapMember(member) });
    }
    catch (error) {
        console.error("[members] create failed", error);
        if (error instanceof Error && "status" in error)
            return res.status(Number(error.status)).json({ message: error.message });
        if (error instanceof Error && error.message === "INVALID_PACKAGE")
            return res.status(400).json({ message: "Gói tập không hợp lệ hoặc đã ngừng bán." });
        if (error instanceof Error && error.message === "INVALID_MEMBERSHIP_DATES")
            return res.status(400).json({ message: "Ngày bắt đầu và ngày hết hạn không hợp lệ." });
        return res.status(500).json({ message: "Không thể tạo hội viên." });
    }
});
exports.membersRoutes.patch("/", async (req, res) => {
    try {
        await (0, authorization_1.requirePermission)(req, "member.update");
        const body = req.body ?? {};
        const id = String(body.id ?? "").trim();
        const branchId = await (0, branches_1.defaultBranchId)(req);
        if (!id)
            return res.status(400).json({ message: "Thiếu mã hội viên." });
        const existing = await prisma_1.prisma.member.findFirst({ where: { id, branchId }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1 } } });
        if (!existing)
            return res.status(404).json({ message: "Không tìm thấy hội viên." });
        const fullName = String(body.name ?? existing.fullName).trim();
        const phone = String(body.phone ?? existing.phone).trim();
        if (!fullName || !phone)
            return res.status(400).json({ message: "Họ tên và số điện thoại là bắt buộc." });
        const email = String(body.email ?? existing.email ?? "").trim() || null;
        if (email && !/^\S+@\S+\.\S+$/.test(email))
            return res.status(400).json({ message: "Email không hợp lệ." });
        const duplicate = await prisma_1.prisma.member.findFirst({ where: { phone, branchId, id: { not: id } }, select: { id: true } });
        if (duplicate)
            return res.status(409).json({ message: "Số điện thoại hội viên đã tồn tại." });
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.member.update({ where: { id }, data: { fullName, phone, email, dateOfBirth: parseDate(body.dateOfBirth, existing.dateOfBirth), address: body.address === undefined ? existing.address : String(body.address).trim() || null, status: memberStatus(body.memberStatus, existing.status) } });
            const packageId = String(body.packageId ?? "").trim();
            const currentMembership = existing.memberships[0];
            if (packageId && packageId !== currentMembership?.packageId) {
                const pkg = await tx.gymPackage.findFirst({ where: { id: packageId, branchId, status: "ACTIVE" } });
                if (!pkg)
                    throw new Error("INVALID_PACKAGE");
                const startDate = parseDate(body.startDate, new Date()) ?? new Date();
                const endDate = parseDate(body.endDate) ?? new Date(startDate.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
                if (endDate <= startDate)
                    throw new Error("INVALID_MEMBERSHIP_DATES");
                if (currentMembership)
                    await tx.membership.update({ where: { id: currentMembership.id }, data: { packageId: pkg.id, startDate, endDate, price: pkg.price, status: membershipStatus(body.membershipStatus, "ACTIVE") } });
                else
                    await tx.membership.create({ data: { memberId: id, packageId: pkg.id, startDate, endDate, price: pkg.price, status: membershipStatus(body.membershipStatus, "ACTIVE") } });
            }
            else if (currentMembership) {
                const startDate = parseDate(body.startDate, currentMembership.startDate) ?? currentMembership.startDate;
                const endDate = parseDate(body.endDate, currentMembership.endDate) ?? currentMembership.endDate;
                if (endDate <= startDate)
                    throw new Error("INVALID_MEMBERSHIP_DATES");
                await tx.membership.update({ where: { id: currentMembership.id }, data: { startDate, endDate, status: membershipStatus(body.membershipStatus, currentMembership.status) } });
            }
            return tx.member.findUniqueOrThrow({ where: { id }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } } });
        });
        await invalidate(branchId);
        return res.json({ data: mapMember(updated) });
    }
    catch (error) {
        console.error("[members] update failed", error);
        if (error instanceof Error && "status" in error)
            return res.status(Number(error.status)).json({ message: error.message });
        if (error instanceof Error && error.message === "INVALID_PACKAGE")
            return res.status(400).json({ message: "Gói tập không hợp lệ hoặc đã ngừng bán." });
        if (error instanceof Error && error.message === "INVALID_MEMBERSHIP_DATES")
            return res.status(400).json({ message: "Ngày bắt đầu và ngày hết hạn không hợp lệ." });
        return res.status(500).json({ message: "Không thể cập nhật hội viên." });
    }
});
exports.membersRoutes.delete("/", async (req, res) => {
    try {
        await (0, authorization_1.requirePermission)(req, "member.delete");
        const id = String(req.body?.id ?? "").trim();
        const branchId = await (0, branches_1.defaultBranchId)(req);
        const existing = await prisma_1.prisma.member.findFirst({ where: { id, branchId }, select: { id: true } });
        if (!existing)
            return res.status(404).json({ message: "Không tìm thấy hội viên." });
        await prisma_1.prisma.member.update({ where: { id }, data: { status: "INACTIVE" } });
        await invalidate(branchId);
        return res.json({ message: "Đã ngừng hoạt động hội viên." });
    }
    catch (error) {
        console.error("[members] delete failed", error);
        if (error instanceof Error && "status" in error)
            return res.status(Number(error.status)).json({ message: error.message });
        return res.status(500).json({ message: "Không thể xóa hội viên." });
    }
});
