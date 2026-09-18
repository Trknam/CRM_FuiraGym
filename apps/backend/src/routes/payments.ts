import { Router } from "express";
import { prisma } from "../db/prisma";
import { requirePermission, getAccessibleBranchIds } from "../auth/authorization";
import { cacheDelete, cacheGet, cacheSet } from "../cache/valkey";
import { cacheKeys } from "../cache/keys";
const methodMap: Record<string, "CASH" | "BANK_TRANSFER" | "CARD"> = {
    "Tiền mặt": "CASH",
    "Chuyển khoản": "BANK_TRANSFER",
    Thẻ: "CARD",
};
const statusMap: Record<string, "PAID" | "PENDING" | "CANCELLED"> = {
    "Đã thanh toán": "PAID",
    "Chờ thanh toán": "PENDING",
    "Đã hủy": "CANCELLED",
};
const methods = { CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản", CARD: "Thẻ" };
const statuses = { PAID: "Đã thanh toán", PENDING: "Chờ thanh toán", CANCELLED: "Đã hủy" };
const out = (x: any) => ({
    id: x.id,
    member: x.member.fullName,
    memberId: x.memberId,
    membershipId: x.membershipId ?? "",
    amount: Number(x.amount),
    method: methods[x.method as keyof typeof methods],
    status: statuses[x.status as keyof typeof statuses],
    date: (x.paidAt ?? x.createdAt).toISOString().slice(0, 10),
    paidAt: x.paidAt?.toISOString() ?? null,
    note: x.note ?? "",
});
export const paymentsRoutes = Router();
paymentsRoutes.get("/qr", async (req, res) => {
    try {
        await requirePermission(req, "payment.read");
        const ids = await getAccessibleBranchIds(req);
        const branchId = ids[0];
        const rows = await prisma.gymSetting.findMany({
            where: {
                branchId,
                name: { in: ["PAYMENT_BANK_ID", "PAYMENT_ACCOUNT_NO", "PAYMENT_ACCOUNT_NAME"] },
            },
        });
        const map = new Map(rows.map((x: { name: string; value: string }) => [x.name, x.value]));
        const bankId = String(map.get("PAYMENT_BANK_ID") ?? "MB").trim() || "MB",
            accountNo =
                String(map.get("PAYMENT_ACCOUNT_NO") ?? "0377433503").trim() || "0377433503",
            accountName =
                String(map.get("PAYMENT_ACCOUNT_NAME") ?? "Trần Khánh Nam").trim() ||
                "Trần Khánh Nam";
        const amount = Math.round(Number(req.query.amount));
        const addInfo = String(req.query.addInfo ?? "")
            .trim()
            .slice(0, 25);
        if (
            !branchId ||
            !bankId ||
            !accountNo ||
            !accountName ||
            !Number.isFinite(amount) ||
            amount <= 0
        )
            return res
                .status(400)
                .json({ message: "Chưa cấu hình tài khoản nhận tiền hoặc số tiền không hợp lệ." });
        const params = new URLSearchParams({ amount: String(amount), addInfo, accountName });
        const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-compact2.png?${params.toString()}`;
        return res.json({ data: { qrUrl, bankId, accountNo, accountName, amount, addInfo } });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        return res.status(500).json({ message: "Không thể tạo QR thanh toán." });
    }
});
paymentsRoutes.get("/", async (req, res) => {
    try {
        await requirePermission(req, "payment.read");
        const ids = await getAccessibleBranchIds(req);
        const rows = await prisma.payment.findMany({
            where: { branchId: { in: ids } },
            include: { member: true },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ data: rows.map(out), cached: false });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        return res.status(500).json({ message: "Không thể lấy giao dịch." });
    }
});
paymentsRoutes.post("/", async (req, res) => {
    try {
        await requirePermission(req, "payment.create");
        const b = req.body ?? {},
            memberId = String(b.memberId ?? "").trim(),
            amount = Number(b.amount);
        const ids = await getAccessibleBranchIds(req);
        const member = await prisma.member.findFirst({
            where: { id: memberId, branchId: { in: ids } },
        });
        const status = statusMap[String(b.status)] ?? "PENDING";
        const paidAt = status === "PAID" ? (b.date ? new Date(b.date) : new Date()) : null;
        const membershipId = String(b.membershipId ?? "").trim();
        const membership = membershipId
            ? await prisma.membership.findFirst({
                  where: { id: membershipId, memberId, member: { branchId: { in: ids } } },
                  select: { id: true },
              })
            : null;
        if (
            !member ||
            (membershipId && !membership) ||
            !Number.isFinite(amount) ||
            amount <= 0 ||
            (b.date && Number.isNaN(new Date(b.date).getTime()))
        )
            return res
                .status(400)
                .json({ message: "Hội viên, số tiền hoặc ngày giao dịch không hợp lệ." });
        const row = await prisma.payment.create({
            data: {
                branchId: member.branchId,
                memberId,
                membershipId: membershipId || null,
                amount,
                method: methodMap[String(b.method)] ?? "CASH",
                status,
                paidAt,
            },
            include: { member: true },
        });
        await cacheDelete(cacheKeys.payments("all"));
        return res.status(201).json({ data: out(row) });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        return res.status(500).json({ message: "Không thể tạo giao dịch." });
    }
});
paymentsRoutes.post("/:id/confirm", async (req, res) => {
    try {
        await requirePermission(req, "payment.update");
        const ids = await getAccessibleBranchIds(req);
        const existing = await prisma.payment.findFirst({
            where: { id: String(req.params.id), branchId: { in: ids } },
            include: { member: true },
        });
        if (!existing) return res.status(404).json({ message: "Không tìm thấy giao dịch." });
        if (existing.status === "CANCELLED")
            return res.status(400).json({ message: "Không thể xác nhận giao dịch đã hủy." });
        const row = await prisma.payment.update({
            where: { id: existing.id },
            data: { status: "PAID", paidAt: new Date() },
            include: { member: true },
        });
        await cacheDelete(cacheKeys.payments("all"));
        return res.json({ data: out(row), message: "Đã xác nhận thanh toán thành công." });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        return res.status(500).json({ message: "Không thể xác nhận thanh toán." });
    }
});
paymentsRoutes.patch("/", async (req, res) => {
    try {
        await requirePermission(req, "payment.update");
        const b = req.body ?? {},
            ids = await getAccessibleBranchIds(req);
        const existing = await prisma.payment.findFirst({
            where: { id: String(b.id), ...(ids === null ? {} : { branchId: { in: ids } }) },
        });
        if (!existing) return res.status(404).json({ message: "Không tìm thấy giao dịch." });
        const row = await prisma.payment.update({
            where: { id: existing.id },
            data: {
                amount: Number(b.amount ?? existing.amount),
                method: methodMap[String(b.method)] ?? existing.method,
                status: statusMap[String(b.status)] ?? existing.status,
                paidAt:
                    (statusMap[String(b.status)] ?? existing.status) === "PAID"
                        ? b.date
                            ? new Date(b.date)
                            : existing.paidAt ?? new Date()
                        : null,
            },
            include: { member: true },
        });
        await cacheDelete(cacheKeys.payments("all"));
        return res.json({ data: out(row) });
    } catch {
        return res.status(500).json({ message: "Không thể cập nhật giao dịch." });
    }
});
paymentsRoutes.delete("/", async (req, res) => {
    try {
        await requirePermission(req, "payment.delete");
        const ids = await getAccessibleBranchIds(req);
        const paymentIds: string[] = Array.from(new Set<string>(
            Array.isArray(req.body?.ids)
                ? req.body.ids.map((value: unknown) => String(value).trim()).filter(Boolean)
                : [String(req.body?.id ?? "").trim()].filter(Boolean),
        ));
        if (paymentIds.length === 0) return res.status(400).json({ message: "Chưa chọn giao dịch." });
        const existing = await prisma.payment.findMany({
            where: { id: { in: paymentIds }, ...(ids === null ? {} : { branchId: { in: ids } }) },
        });
        if (existing.length === 0) return res.status(404).json({ message: "Không tìm thấy giao dịch." });
        const deletedIds = existing.map((item) => item.id);
        await prisma.payment.deleteMany({
            where: { id: { in: deletedIds } },
        });
        await cacheDelete(cacheKeys.payments("all"));
        return res.json({ message: "Đã xóa giao dịch khỏi lịch sử.", deletedIds });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        console.error("[payments] delete failed", error);
        return res.status(500).json({ message: "Không thể xóa giao dịch." });
    }
});
