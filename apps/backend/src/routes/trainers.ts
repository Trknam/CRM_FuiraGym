import { Router } from "express";
import { prisma } from "../db/prisma";
import { requirePermission, getAccessibleBranchIds } from "../auth/authorization";
import { cacheDelete } from "../cache/valkey";
import { cacheKeys } from "../cache/keys";
import { defaultBranchId } from "../api/branches";

export const trainersRoutes = Router();

function mapTrainer(trainer: any) {
  return {
    id: trainer.id,
    name: trainer.fullName,
    email: trainer.email ?? "",
    phone: trainer.phone,
    specialty: trainer.specialty ?? "",
    bio: trainer.bio ?? "",
    hourlyRate: trainer.hourlyRate == null ? "" : String(trainer.hourlyRate),
    status: trainer.isActive ? "Đang hoạt động" : "Tạm nghỉ",
  };
}

function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/\s+/g, "").trim();
}

async function trainerInScope(id: string, branchId: string) {
  return prisma.trainer.findFirst({ where: { id, branchId } });
}

trainersRoutes.get("/", async (req, res) => {
  try {
    await requirePermission(req, "trainer.read");
    const branchId = await defaultBranchId(req);
    const rows = await prisma.trainer.findMany({ where: { branchId }, orderBy: { createdAt: "desc" } });
    return res.json({ data: rows.map(mapTrainer), cached: false });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    console.error("[trainers] list failed", error);
    return res.status(500).json({ message: "Không thể lấy danh sách PT / Trainer." });
  }
});

trainersRoutes.post("/", async (req, res) => {
  try {
    await requirePermission(req, "trainer.create");
    const body = req.body ?? {};
    const branchId = await defaultBranchId(req);
    if (!branchId) return res.status(400).json({ message: "Chưa có cơ sở để tạo PT." });
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase() || null;
    const phone = normalizePhone(body.phone);
    const specialty = String(body.specialty ?? "").trim() || null;
    const bio = String(body.bio ?? "").trim() || null;
    const hourlyRate = body.hourlyRate === undefined || body.hourlyRate === "" ? null : Number(body.hourlyRate);
    if (!name || !phone) return res.status(400).json({ message: "Họ tên và số điện thoại là bắt buộc." });
    if (!/^\d{9,11}$/.test(phone)) return res.status(400).json({ message: "Số điện thoại PT không hợp lệ." });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Email PT không hợp lệ." });
    if (hourlyRate !== null && (!Number.isFinite(hourlyRate) || hourlyRate < 0)) return res.status(400).json({ message: "Mức phí PT không hợp lệ." });
    const duplicate = await prisma.trainer.findFirst({ where: { branchId, OR: [{ phone }, ...(email ? [{ email }] : [])] }, select: { id: true } });
    if (duplicate) return res.status(409).json({ message: "Email hoặc số điện thoại PT đã tồn tại." });
    const trainer = await prisma.trainer.create({ data: { branchId, fullName: name, email, phone, specialty, bio, hourlyRate: hourlyRate === null ? undefined : hourlyRate } });
    await cacheDelete(cacheKeys.trainers("all"));
    return res.status(201).json({ data: mapTrainer(trainer) });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    console.error("[trainers] create failed", error);
    return res.status(500).json({ message: "Không thể tạo PT / Trainer." });
  }
});

trainersRoutes.patch("/", async (req, res) => {
  try {
    await requirePermission(req, "trainer.update");
    const body = req.body ?? {};
    const id = String(body.id ?? "").trim();
    const branchId = await defaultBranchId(req);
    if (!id) return res.status(400).json({ message: "Thiếu mã PT." });
    const existing = await trainerInScope(id, branchId);
    if (!existing) return res.status(404).json({ message: "Không tìm thấy PT." });
    const name = String(body.name ?? existing.fullName).trim();
    const email = body.email === undefined ? existing.email : String(body.email ?? "").trim().toLowerCase() || null;
    const phone = normalizePhone(body.phone === undefined ? existing.phone : body.phone);
    const specialty = body.specialty === undefined ? existing.specialty : String(body.specialty ?? "").trim() || null;
    const bio = body.bio === undefined ? existing.bio : String(body.bio ?? "").trim() || null;
    const hourlyRate = body.hourlyRate === undefined || body.hourlyRate === "" ? existing.hourlyRate : Number(body.hourlyRate);
    const isActive = body.status === undefined ? existing.isActive : body.status === "Đang hoạt động";
    if (!name || !phone) return res.status(400).json({ message: "Họ tên và số điện thoại là bắt buộc." });
    if (!/^\d{9,11}$/.test(phone)) return res.status(400).json({ message: "Số điện thoại PT không hợp lệ." });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Email PT không hợp lệ." });
    if (hourlyRate !== null && (!Number.isFinite(Number(hourlyRate)) || Number(hourlyRate) < 0)) return res.status(400).json({ message: "Mức phí PT không hợp lệ." });
    const duplicate = await prisma.trainer.findFirst({ where: { branchId, id: { not: id }, OR: [{ phone }, ...(email ? [{ email }] : [])] }, select: { id: true } });
    if (duplicate) return res.status(409).json({ message: "Email hoặc số điện thoại PT đã được sử dụng." });
    const updated = await prisma.trainer.update({ where: { id }, data: { fullName: name, email, phone, specialty, bio, hourlyRate, isActive } });
    await cacheDelete(cacheKeys.trainers("all"));
    return res.json({ data: mapTrainer(updated) });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    console.error("[trainers] update failed", error);
    return res.status(500).json({ message: "Không thể cập nhật PT / Trainer." });
  }
});

trainersRoutes.delete("/", async (req, res) => {
  try {
    await requirePermission(req, "trainer.delete");
    const id = String(req.body?.id ?? req.query?.id ?? "").trim();
    const branchId = await defaultBranchId(req);
    if (!id) return res.status(400).json({ message: "Thiếu mã PT." });
    const existing = await trainerInScope(id, branchId);
    if (!existing) return res.status(404).json({ message: "Không tìm thấy PT." });
    await prisma.trainer.update({ where: { id }, data: { isActive: false } });
    await cacheDelete(cacheKeys.trainers("all"));
    return res.json({ message: "Đã chuyển PT sang trạng thái Tạm nghỉ." });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    console.error("[trainers] delete failed", error);
    return res.status(500).json({ message: "Không thể cập nhật PT." });
  }
});
