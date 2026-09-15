import { Router } from "express";
import { prisma } from "../db/prisma";
import { hashPassword } from "../auth/password";
import { requireRole } from "../auth/authorization";
import { ROLE_PERMISSIONS, type Permission } from "../auth/permissions";

export const usersRoutes = Router();
type ManagedRole = "SUPER_ADMIN" | "STAFF";
const MANAGED_ROLES: ManagedRole[] = ["SUPER_ADMIN", "STAFF"];

const ROLE_LABELS: Record<ManagedRole, string> = {
  SUPER_ADMIN: "Quản trị hệ thống",
  STAFF: "Nhân viên",
};

const PERMISSION_LABELS: Record<Permission, string> = {
  "branch.read": "Xem thông tin phòng Gym", "branch.create": "Thêm phòng Gym", "branch.update": "Sửa thông tin phòng Gym", "branch.delete": "Xóa phòng Gym",
  "user.read": "Xem tài khoản", "user.create": "Tạo tài khoản", "user.update": "Sửa tài khoản / phân quyền", "user.delete": "Khóa tài khoản",
  "member.read": "Xem hội viên", "member.create": "Thêm hội viên", "member.update": "Sửa hội viên", "member.delete": "Ngừng hội viên",
  "lead.read": "Xem Lead", "lead.create": "Thêm Lead", "lead.update": "Sửa Lead", "lead.delete": "Xóa Lead",
  "crm.read": "Xem CRM chăm sóc", "crm.create": "Tạo hoạt động CRM", "crm.update": "Sửa hoạt động CRM", "crm.delete": "Xóa hoạt động CRM",
  "payment.read": "Xem thanh toán", "payment.create": "Tạo thanh toán", "payment.update": "Sửa thanh toán", "payment.delete": "Hủy / xóa thanh toán",
  "package.read": "Xem gói tập", "package.create": "Thêm gói tập", "package.update": "Sửa gói tập", "package.delete": "Ngừng gói tập",
  "checkin.read": "Xem Check-in", "checkin.create": "Tạo Check-in", "checkin.update": "Sửa Check-in", "checkin.delete": "Xóa Check-in",
  "trainer.read": "Xem PT / Trainer", "trainer.create": "Thêm PT / Trainer", "trainer.update": "Sửa PT / Trainer", "trainer.delete": "Xóa PT / Trainer",
  "exercise.read": "Xem Exercise Database", "exercise.create": "Thêm bài tập", "exercise.update": "Sửa bài tập", "exercise.delete": "Xóa bài tập",
  "workout.read": "Xem giáo án", "workout.generate": "Tạo giáo án AI", "report.read": "Xem báo cáo",
  "settings.read": "Xem cài đặt", "settings.update": "Sửa cài đặt",
};

function managedRole(value: unknown): ManagedRole | null {
  return MANAGED_ROLES.includes(value as ManagedRole) ? value as ManagedRole : null;
}

function mapUser(user: { id: string; fullName: string; email: string | null; phone: string | null; role: string; isActive: boolean; createdAt: Date }) {
  const role = managedRole(user.role) ?? "STAFF";
  return { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role, roleLabel: ROLE_LABELS[role], isActive: user.isActive, createdAt: user.createdAt };
}

usersRoutes.get("/", async (req, res) => {
  try {
    await requireRole(req, "SUPER_ADMIN");
    const users = await prisma.user.findMany({ where: { role: { in: MANAGED_ROLES } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }], select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true, createdAt: true } });
    return res.json({ data: users.map(mapUser) });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    console.error("[users] list failed", error);
    return res.status(500).json({ message: "Không thể lấy danh sách tài khoản." });
  }
});

usersRoutes.get("/permissions", async (req, res) => {
  try {
    await requireRole(req, "SUPER_ADMIN");
    return res.json({ roles: MANAGED_ROLES.map((role) => ({ role, label: ROLE_LABELS[role], permissions: ROLE_PERMISSIONS[role].map((permission) => ({ key: permission, label: PERMISSION_LABELS[permission] })) })) });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    return res.status(500).json({ message: "Không thể lấy cấu hình quyền." });
  }
});

usersRoutes.post("/", async (req, res) => {
  try {
    await requireRole(req, "SUPER_ADMIN");
    const fullName = String(req.body?.fullName ?? "").trim();
    const identifier = String(req.body?.identifier ?? "").trim();
    const password = String(req.body?.password ?? "");
    const role = managedRole(req.body?.role) ?? "STAFF";
    if (!fullName || !identifier || password.length < 8) return res.status(400).json({ message: "Họ tên, tài khoản và mật khẩu tối thiểu 8 ký tự là bắt buộc." });
    const email = identifier.includes("@") ? identifier.toLowerCase() : null;
    const phone = email ? null : identifier.replace(/\D/g, "");
    if (!email && (!phone || phone.length < 9)) return res.status(400).json({ message: "Email hoặc số điện thoại không hợp lệ." });
    const duplicate = await prisma.user.findFirst({ where: { OR: [{ email: email ?? undefined }, { phone: phone ?? undefined }] }, select: { id: true } });
    if (duplicate) return res.status(409).json({ message: "Email hoặc số điện thoại đã tồn tại." });
    const user = await prisma.user.create({ data: { fullName, email, phone, passwordHash: await hashPassword(password), role, isActive: true }, select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true, createdAt: true } });
    return res.status(201).json({ data: mapUser(user) });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    console.error("[users] create failed", error);
    return res.status(500).json({ message: "Không thể tạo tài khoản." });
  }
});

usersRoutes.patch("/", async (req, res) => {
  try {
    const current = await requireRole(req, "SUPER_ADMIN");
    const id = String(req.body?.id ?? "");
    if (!id) return res.status(400).json({ message: "Thiếu mã tài khoản." });
    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
    if (!existing || !MANAGED_ROLES.includes(existing.role as ManagedRole)) return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    const nextRole = req.body?.role === undefined ? managedRole(existing.role) : managedRole(req.body.role);
    const data: { role?: ManagedRole; isActive?: boolean; passwordHash?: string } = {};
    if (nextRole) data.role = nextRole;
    if (typeof req.body?.isActive === "boolean") data.isActive = req.body.isActive;
    if (req.body?.password !== undefined) {
      const password = String(req.body.password);
      if (password.length < 8) return res.status(400).json({ message: "Mật khẩu phải có ít nhất 8 ký tự." });
      data.passwordHash = await hashPassword(password);
    }
    if (id === current.id && data.isActive === false) return res.status(400).json({ message: "Không thể khóa tài khoản đang đăng nhập." });
    if (id === current.id && data.role && data.role !== "SUPER_ADMIN") return res.status(400).json({ message: "Không thể hạ quyền tài khoản quản trị đang đăng nhập." });
    if (existing.role === "SUPER_ADMIN" && data.isActive === false) {
      const activeAdmins = await prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true } });
      if (activeAdmins <= 1) return res.status(400).json({ message: "Phải giữ lại ít nhất một tài khoản quản trị hoạt động." });
    }
    const user = await prisma.user.update({ where: { id }, data, select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true, createdAt: true } });
    return res.json({ data: mapUser(user) });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    console.error("[users] update failed", error);
    return res.status(500).json({ message: "Không thể cập nhật tài khoản." });
  }
});

usersRoutes.delete("/", async (req, res) => {
  try {
    const current = await requireRole(req, "SUPER_ADMIN");
    const id = String(req.body?.id ?? req.query?.id ?? "");
    if (!id) return res.status(400).json({ message: "Thiếu mã tài khoản." });
    if (id === current.id) return res.status(400).json({ message: "Không thể khóa tài khoản đang đăng nhập." });
    const existing = await prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true } });
    if (!existing || !MANAGED_ROLES.includes(existing.role as ManagedRole)) return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    if (existing.role === "SUPER_ADMIN" && existing.isActive) {
      const activeAdmins = await prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true } });
      if (activeAdmins <= 1) return res.status(400).json({ message: "Phải giữ lại ít nhất một tài khoản quản trị hoạt động." });
    }
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    return res.json({ message: "Đã khóa tài khoản." });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    console.error("[users] delete failed", error);
    return res.status(500).json({ message: "Không thể khóa tài khoản." });
  }
});
