import { Router } from "express";
import { prisma } from "../db/prisma";
import { cacheDelete, cacheGet, cacheSet } from "../cache/valkey";
import { cacheKeys } from "../cache/keys";
import { requirePermission } from "../auth/authorization";
import { defaultBranchId } from "../api/branches";

export const membersRoutes = Router();

function mapMember(member: any) {
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

function memberStatus(value: unknown, fallback: "ACTIVE" | "INACTIVE" | "BLOCKED") {
  const text = String(value ?? "").trim().toUpperCase();
  if (text === "ĐANG HOẠT ĐỘNG" || text === "ACTIVE") return "ACTIVE" as const;
  if (text === "TẠM NGHỈ" || text === "INACTIVE") return "INACTIVE" as const;
  if (text === "BỊ KHÓA" || text === "BLOCKED") return "BLOCKED" as const;
  return fallback;
}

function membershipStatus(value: unknown, fallback: "ACTIVE" | "EXPIRED" | "CANCELLED") {
  const text = String(value ?? "").trim().toUpperCase();
  if (text === "ĐANG HOẠT ĐỘNG" || text === "ACTIVE") return "ACTIVE" as const;
  if (text === "HẾT HẠN" || text === "EXPIRED") return "EXPIRED" as const;
  if (text === "ĐÃ HỦY" || text === "CANCELLED") return "CANCELLED" as const;
  return fallback;
}

function parseDate(value: unknown, fallback?: Date | null) {
  if (value === undefined || value === null || String(value).trim() === "") return fallback ?? null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function invalidate(branchId: string) {
  await cacheDelete(cacheKeys.members(branchId));
}

async function syncExpiredMemberships(branchId: string) {
  const result = await prisma.membership.updateMany({
    where: {
      member: { branchId },
      status: "ACTIVE",
      endDate: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
  if (result.count > 0) {
    await invalidate(branchId);
  }
  return result.count;
}

membersRoutes.get("/", async (req, res) => {
  try {
    await requirePermission(req, "member.read");
    const branchId = await defaultBranchId(req);
    await syncExpiredMemberships(branchId);
    const key = cacheKeys.members(branchId);
    const cached = await cacheGet<unknown[]>(key);
    if (cached) return res.json({ data: cached, cached: true });
    const members = await prisma.member.findMany({
      where: { branchId },
      orderBy: { createdAt: "desc" },
      include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } },
    });
    const data = members.map(mapMember);
    await cacheSet(key, data, 60);
    return res.json({ data, cached: false });
  } catch (error) {
    console.error("[members] list failed", error);
    if (error instanceof Error && "status" in error) return res.status(Number((error as any).status)).json({ message: (error as any).message });
    return res.status(500).json({ message: "Không thể lấy danh sách hội viên." });
  }
});

membersRoutes.post("/", async (req, res) => {
  try {
    await requirePermission(req, "member.create");
    const body = req.body ?? {};
    const branchId = await defaultBranchId(req);
    const fullName = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim() || null;
    if (!fullName || !phone) return res.status(400).json({ message: "Họ tên và số điện thoại là bắt buộc." });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Email không hợp lệ." });
    const duplicate = await prisma.member.findFirst({ where: { phone, branchId } });
    if (duplicate) return res.status(409).json({ message: "Số điện thoại hội viên đã tồn tại." });
    const count = await prisma.member.count({ where: { branchId } });
    const member = await prisma.$transaction(async (tx) => {
      const created = await tx.member.create({
        data: { branchId, memberCode: `MB-${String(count + 1).padStart(5, "0")}`, fullName, phone, email, dateOfBirth: parseDate(body.dateOfBirth), address: String(body.address ?? "").trim() || null, status: memberStatus(body.memberStatus, "ACTIVE") },
      });
      const packageId = String(body.packageId ?? "").trim();
      if (packageId) {
        const pkg = await tx.gymPackage.findFirst({ where: { id: packageId, branchId, status: "ACTIVE" } });
        if (!pkg) throw new Error("INVALID_PACKAGE");
        const startDate = parseDate(body.startDate, new Date()) ?? new Date();
        const endDate = parseDate(body.endDate) ?? new Date(startDate.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
        if (endDate <= startDate) throw new Error("INVALID_MEMBERSHIP_DATES");
        await tx.membership.create({ data: { memberId: created.id, packageId: pkg.id, startDate, endDate, price: pkg.price, status: membershipStatus(body.membershipStatus, "ACTIVE") } });
      }
      return tx.member.findUniqueOrThrow({ where: { id: created.id }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } } });
    });
    await invalidate(branchId);
    return res.status(201).json({ data: mapMember(member) });
  } catch (error) {
    console.error("[members] create failed", error);
    if (error instanceof Error && "status" in error) return res.status(Number((error as any).status)).json({ message: (error as any).message });
    if (error instanceof Error && error.message === "INVALID_PACKAGE") return res.status(400).json({ message: "Gói tập không hợp lệ hoặc đã ngừng bán." });
    if (error instanceof Error && error.message === "INVALID_MEMBERSHIP_DATES") return res.status(400).json({ message: "Ngày bắt đầu và ngày hết hạn không hợp lệ." });
    return res.status(500).json({ message: "Không thể tạo hội viên." });
  }
});

membersRoutes.patch("/", async (req, res) => {
  try {
    await requirePermission(req, "member.update");
    const body = req.body ?? {};
    const id = String(body.id ?? "").trim();
    const branchId = await defaultBranchId(req);
    if (!id) return res.status(400).json({ message: "Thiếu mã hội viên." });
    const existing = await prisma.member.findFirst({ where: { id, branchId }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1 } } });
    if (!existing) return res.status(404).json({ message: "Không tìm thấy hội viên." });
    const fullName = String(body.name ?? existing.fullName).trim();
    const phone = String(body.phone ?? existing.phone).trim();
    if (!fullName || !phone) return res.status(400).json({ message: "Họ tên và số điện thoại là bắt buộc." });
    const email = String(body.email ?? existing.email ?? "").trim() || null;
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Email không hợp lệ." });
    const duplicate = await prisma.member.findFirst({ where: { phone, branchId, id: { not: id } }, select: { id: true } });
    if (duplicate) return res.status(409).json({ message: "Số điện thoại hội viên đã tồn tại." });
    const updated = await prisma.$transaction(async (tx) => {
      await tx.member.update({ where: { id }, data: { fullName, phone, email, dateOfBirth: parseDate(body.dateOfBirth, existing.dateOfBirth), address: body.address === undefined ? existing.address : String(body.address).trim() || null, status: memberStatus(body.memberStatus, existing.status) } });
      const packageId = String(body.packageId ?? "").trim();
      const currentMembership = existing.memberships[0];
      if (body.packageId !== undefined && !packageId) {
        if (currentMembership) {
          await tx.membership.update({
            where: { id: currentMembership.id },
            data: { status: "CANCELLED" },
          });
        }
      } else if (packageId && packageId !== currentMembership?.packageId) {
        const pkg = await tx.gymPackage.findFirst({ where: { id: packageId, branchId, status: "ACTIVE" } });
        if (!pkg) throw new Error("INVALID_PACKAGE");
        const startDate = parseDate(body.startDate, new Date()) ?? new Date();
        const endDate = parseDate(body.endDate) ?? new Date(startDate.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
        if (endDate <= startDate) throw new Error("INVALID_MEMBERSHIP_DATES");
        if (currentMembership) await tx.membership.update({ where: { id: currentMembership.id }, data: { packageId: pkg.id, startDate, endDate, price: pkg.price, status: membershipStatus(body.membershipStatus, "ACTIVE") } });
        else await tx.membership.create({ data: { memberId: id, packageId: pkg.id, startDate, endDate, price: pkg.price, status: membershipStatus(body.membershipStatus, "ACTIVE") } });
      } else if (currentMembership) {
        const startDate = parseDate(body.startDate, currentMembership.startDate) ?? currentMembership.startDate;
        const endDate = parseDate(body.endDate, currentMembership.endDate) ?? currentMembership.endDate;
        if (endDate <= startDate) throw new Error("INVALID_MEMBERSHIP_DATES");
        await tx.membership.update({ where: { id: currentMembership.id }, data: { startDate, endDate, status: membershipStatus(body.membershipStatus, currentMembership.status) } });
      }
      return tx.member.findUniqueOrThrow({ where: { id }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } } });
    });
    await invalidate(branchId);
    return res.json({ data: mapMember(updated) });
  } catch (error) {
    console.error("[members] update failed", error);
    if (error instanceof Error && "status" in error) return res.status(Number((error as any).status)).json({ message: (error as any).message });
    if (error instanceof Error && error.message === "INVALID_PACKAGE") return res.status(400).json({ message: "Gói tập không hợp lệ hoặc đã ngừng bán." });
    if (error instanceof Error && error.message === "INVALID_MEMBERSHIP_DATES") return res.status(400).json({ message: "Ngày bắt đầu và ngày hết hạn không hợp lệ." });
    return res.status(500).json({ message: "Không thể cập nhật hội viên." });
  }
});

membersRoutes.delete("/", async (req, res) => {
  try {
    await requirePermission(req, "member.delete");
    const branchId = await defaultBranchId(req);
    const ids: string[] = Array.from(new Set<string>(Array.isArray(req.body?.ids) ? req.body.ids.map((value: unknown) => String(value).trim()).filter(Boolean) : [String(req.body?.id ?? "").trim()].filter(Boolean)));
    if (!branchId || ids.length === 0) return res.status(400).json({ message: "Chưa chọn hội viên." });
    const existing = await prisma.member.findMany({ where: { id: { in: ids }, branchId }, select: { id: true } });
    if (existing.length === 0) return res.status(404).json({ message: "Không tìm thấy hội viên." });
    await prisma.member.updateMany({ where: { id: { in: existing.map((item) => item.id) }, branchId }, data: { status: "INACTIVE" } });
    const updated = await prisma.member.findMany({
      where: { id: { in: existing.map((item) => item.id) }, branchId },
      include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } },
    });
    await invalidate(branchId);
    return res.json({ message: "Đã ngừng hoạt động hội viên.", data: updated.map(mapMember) });
  } catch (error) {
    console.error("[members] delete failed", error);
    if (error instanceof Error && "status" in error) return res.status(Number((error as any).status)).json({ message: (error as any).message });
    return res.status(500).json({ message: "Không thể xóa hội viên." });
  }
});
