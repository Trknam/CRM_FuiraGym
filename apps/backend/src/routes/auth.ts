import { Router } from "express";
import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "../auth/password";
import { isEmail, normalizePhone, validateRegister } from "../validation/auth";
import { clearSessionCookie, createSession, destroySession, getCurrentUser } from "../auth/session";
import { ROLE_PERMISSIONS } from "../auth/permissions";

export const authRoutes = Router();

authRoutes.post("/login", async (req, res) => {
  try {
    const identifier = String(req.body?.identifier ?? "").trim();
    const password = String(req.body?.password ?? "");
    if (!identifier || !password) return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
    const user = await prisma.user.findFirst({ where: isEmail(identifier) ? { email: identifier.toLowerCase() } : { phone: normalizePhone(identifier) } });
    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) return res.status(401).json({ message: "Thông tin đăng nhập không chính xác." });
    await createSession(user.id, res);
    return res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] ?? [] } });
  } catch { return res.status(500).json({ message: "Không thể đăng nhập lúc này." }); }
});

authRoutes.post("/register", async (req, res) => {
  try {
    const input = { fullName: String(req.body?.fullName ?? ""), identifier: String(req.body?.identifier ?? ""), password: String(req.body?.password ?? ""), confirmPassword: String(req.body?.confirmPassword ?? "") };
    const errors = validateRegister(input);
    if (Object.keys(errors).length) return res.status(400).json({ message: "Dữ liệu đăng ký không hợp lệ.", errors });
    const email = isEmail(input.identifier) ? input.identifier.trim().toLowerCase() : null;
    const phone = email ? null : normalizePhone(input.identifier);
    const existing = await prisma.user.findFirst({ where: { OR: [{ email: email ?? undefined }, { phone: phone ?? undefined }] }, select: { id: true } });
    if (existing) return res.status(409).json({ message: "Email hoặc số điện thoại đã được đăng ký." });
    const user = await prisma.user.create({ data: { fullName: input.fullName.trim(), email, phone, passwordHash: await hashPassword(input.password), role: "STAFF" }, select: { id: true, fullName: true, email: true, phone: true, role: true } });
    const branch = await prisma.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (branch) await prisma.userBranch.create({ data: { userId: user.id, branchId: branch.id } });
    await createSession(user.id, res);
    return res.status(201).json({ user });
  } catch { return res.status(500).json({ message: "Không thể tạo tài khoản lúc này." }); }
});

authRoutes.post("/logout", async (req, res) => {
  try { await destroySession(req, res); return res.json({ message: "Đã đăng xuất." }); }
  catch { return res.status(500).json({ message: "Không thể đăng xuất." }); }
});

authRoutes.get("/me", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) {
    clearSessionCookie(res);
    return res.status(401).json({ user: null, message: "UNAUTHORIZED" });
  }
  return res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] ?? [] } });
});
