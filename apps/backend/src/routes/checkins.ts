import crypto from "node:crypto";
import { Router } from "express";
import { prisma } from "../db/prisma";
import { requirePermission, getAccessibleBranchIds } from "../auth/authorization";
import { parseDateTime } from "../utils/date-time";
import { recordActivity } from "../services/activity";
import { sendMemberBrandedEmail } from "../services/email";

const methods = {
    "QR Code": "QR_CODE",
    "Quầy lễ tân": "FRONT_DESK",
} as const;

const statuses = {
    "Hợp lệ": "VALID",
    "Từ chối": "REJECTED",
} as const;

const labels = {
    QR_CODE: "QR Code",
    FRONT_DESK: "Quầy lễ tân",
    VALID: "Hợp lệ",
    REJECTED: "Từ chối",
};

const out = (x: any) => ({
    id: x.id,
    member: x.member.fullName,
    memberId: x.memberId,
    time: x.checkedInAt.toISOString(),
    method: labels[x.method as keyof typeof labels],
    status: labels[x.status as keyof typeof labels],
});

export const checkinsRoutes = Router();

checkinsRoutes.get("/", async (req, res) => {
    try {
        await requirePermission(req, "checkin.read");
        const ids = await getAccessibleBranchIds(req);
        const rows = await prisma.checkIn.findMany({
            where: { branchId: { in: ids } },
            include: { member: true },
            orderBy: { checkedInAt: "desc" },
        });
        return res.json({ data: rows.map(out), cached: false });
    } catch (error) {
        console.error("[checkins] list failed", error);
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        return res.status(500).json({ message: "Không thể lấy lịch sử check-in." });
    }
});

checkinsRoutes.get("/eligible-members", async (req, res) => {
    try {
        await requirePermission(req, "checkin.read");
        const ids = await getAccessibleBranchIds(req);
        const now = new Date();

        const members = await prisma.member.findMany({
            where: {
                branchId: { in: ids },
                status: "ACTIVE",
                memberships: {
                    some: {
                        status: "ACTIVE",
                        startDate: { lte: now },
                        endDate: { gte: now },
                    },
                },
            },
            orderBy: { fullName: "asc" },
            include: {
                memberships: {
                    where: {
                        status: "ACTIVE",
                        startDate: { lte: now },
                        endDate: { gte: now },
                    },
                    orderBy: { endDate: "desc" },
                    take: 1,
                    include: { package: true },
                },
            },
        });

        return res.json({
            data: members.map((member) => ({
                id: member.id,
                name: member.fullName,
                memberCode: member.memberCode,
                package: member.memberships[0]?.package?.name ?? "Chưa có gói",
                endDate: member.memberships[0]?.endDate.toISOString() ?? null,
            })),
        });
    } catch (error) {
        console.error("[checkins] eligible members failed", error);
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        return res
            .status(500)
            .json({ message: "Không thể lấy danh sách hội viên đủ điều kiện check-in." });
    }
});

checkinsRoutes.post("/qr", async (req, res) => {
    try {
        await requirePermission(req, "checkin.create");
        const memberId = String(req.body?.memberId ?? "").trim();
        const ids = await getAccessibleBranchIds(req);
        if (!memberId) return res.status(400).json({ message: "Chưa chọn hội viên." });
        const member = await prisma.member.findFirst({
            where: { id: memberId, branchId: { in: ids }, status: "ACTIVE" },
        });
        if (!member) return res.status(404).json({ message: "Không tìm thấy hội viên." });
        const qrCode = "GYM-" + crypto.randomUUID();
        const updated = await prisma.member.update({
            where: { id: member.id },
            data: { qrCode, lastInactivityReminderSentAt: null },
            select: { id: true, fullName: true, memberCode: true, qrCode: true },
        });
        await recordActivity({ req, action: "đã tạo lại mã QR", entity: "member", entityId: member.id, targetName: member.fullName, branchId: member.branchId });
        return res.json({ data: updated });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        console.error("[checkins] qr generation failed", error);
        return res.status(500).json({ message: "Không thể tạo mã QR." });
    }
});

checkinsRoutes.post("/scan", async (req, res) => {
    try {
        await requirePermission(req, "checkin.create");
        const qrCode = String(req.body?.qrCode ?? "").trim();
        const checkedInAt = new Date();
        if (!qrCode) return res.status(400).json({ message: "Mã QR không hợp lệ." });
        const member = await prisma.member.findFirst({
            where: { qrCode, status: "ACTIVE" },
            include: {
                memberships: {
                    where: {
                        status: "ACTIVE",
                        startDate: { lte: checkedInAt },
                        endDate: { gte: checkedInAt },
                    },
                    orderBy: { endDate: "desc" },
                    take: 1,
                },
            },
        });
        if (!member || member.memberships.length === 0) {
            return res.status(400).json({
                message: "QR không hợp lệ hoặc hội viên đã hết hạn/ngừng hoạt động.",
            });
        }
        const row = await prisma.checkIn.create({
            data: {
                branchId: member.branchId,
                memberId: member.id,
                checkedInAt,
                method: "QR_CODE",
                status: "VALID",
            },
            include: { member: true },
        });
        await prisma.member.update({
            where: { id: member.id },
            data: { qrCode: "GYM-" + crypto.randomUUID(), lastInactivityReminderSentAt: null },
        });
        await recordActivity({
            req,
            action: "đã check-in",
            entity: "checkin",
            entityId: row.id,
            targetName: member.fullName,
            branchId: member.branchId,
        });
        void sendMemberBrandedEmail(
            member.email,
            member.fullName,
            "Check-in thành công",
            "<p>Trung tâm xác nhận anh/chị đã check-in thành công lúc " +
                checkedInAt.toLocaleString("vi-VN") + ".</p>",
        );
        return res.status(201).json({
            message: "Check-in thành công: " + member.fullName + ".",
            data: out(row),
        });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        console.error("[checkins] scan failed", error);
        return res.status(500).json({ message: "Không thể check-in bằng QR." });
    }
});

checkinsRoutes.post("/", async (req, res) => {
    try {
        await requirePermission(req, "checkin.create");

        const body = req.body ?? {};
        const memberId = String(body.memberId ?? "").trim();
        const ids = await getAccessibleBranchIds(req);
        // Khi tạo mới, thời gian check-in luôn do BE ghi nhận tại thời điểm hoàn tất.
        const checkedInAt = new Date();

        if (!memberId || !checkedInAt) {
            return res
                .status(400)
                .json({ message: "Hội viên và thời gian check-in không hợp lệ." });
        }

        if (checkedInAt > new Date()) {
            return res.status(400).json({ message: "Thời gian check-in không được ở tương lai." });
        }

        const member = await prisma.member.findFirst({
            where: {
                id: memberId,
                branchId: { in: ids },
                status: "ACTIVE",
            },
            include: {
                memberships: {
                    where: {
                        status: "ACTIVE",
                        startDate: { lte: checkedInAt },
                        endDate: { gte: checkedInAt },
                    },
                    orderBy: { endDate: "desc" },
                    take: 1,
                },
            },
        });

        if (!member || member.memberships.length === 0) {
            return res.status(400).json({
                message: "Hội viên không hoạt động hoặc gói tập đã hết hạn tại thời điểm check-in.",
            });
        }

        const row = await prisma.checkIn.create({
            data: {
                branchId: member.branchId,
                memberId,
                checkedInAt,
                method: methods[String(body.method) as keyof typeof methods] ?? "FRONT_DESK",
                status: "VALID",
            },
            include: { member: true },
        });
        await recordActivity({
            req,
            action: "đã check-in",
            entity: "checkin",
            entityId: row.id,
            targetName: member.fullName,
            branchId: member.branchId,
        });
        void sendMemberBrandedEmail(
            member.email,
            member.fullName,
            "Check-in thành công",
            "<p>Trung tâm xác nhận anh/chị đã check-in thành công lúc " +
                checkedInAt.toLocaleString("vi-VN") + ".</p>",
        );
        return res.status(201).json({ data: out(row) });
    } catch (error) {
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        console.error("[checkins] create failed", error);
        return res.status(500).json({ message: "Không thể tạo check-in." });
    }
});

checkinsRoutes.patch("/", async (req, res) => {
    try {
        await requirePermission(req, "checkin.update");

        const body = req.body ?? {};
        const id = String(body.id ?? "").trim();
        const ids = await getAccessibleBranchIds(req);

        const existing = await prisma.checkIn.findFirst({
            where: { id, branchId: { in: ids } },
        });

        if (!existing) {
            return res.status(404).json({ message: "Không tìm thấy lượt check-in." });
        }

        const memberId = String(body.memberId ?? existing.memberId).trim();
        const checkedInAt = body.time ? parseDateTime(body.time) : existing.checkedInAt;

        if (!checkedInAt || checkedInAt > new Date()) {
            return res.status(400).json({ message: "Thời gian check-in không hợp lệ." });
        }

        const member = await prisma.member.findFirst({
            where: {
                id: memberId,
                branchId: { in: ids },
                status: "ACTIVE",
            },
            include: {
                memberships: {
                    where: {
                        status: "ACTIVE",
                        startDate: { lte: checkedInAt },
                        endDate: { gte: checkedInAt },
                    },
                    orderBy: { endDate: "desc" },
                    take: 1,
                },
            },
        });

        if (!member || member.memberships.length === 0) {
            return res.status(400).json({
                message: "Hội viên không hoạt động hoặc gói tập đã hết hạn tại thời điểm check-in.",
            });
        }

        const row = await prisma.checkIn.update({
            where: { id },
            data: {
                memberId,
                branchId: member.branchId,
                checkedInAt,
                method: methods[String(body.method) as keyof typeof methods] ?? existing.method,
                status: statuses[String(body.status) as keyof typeof statuses] ?? existing.status,
            },
            include: { member: true },
        });
        await prisma.member.update({ where: { id: member.id }, data: { lastInactivityReminderSentAt: null } });
        await recordActivity({ req, action: "đã cập nhật check-in", entity: "checkin", entityId: row.id, targetName: member.fullName, branchId: member.branchId });

        return res.json({ data: out(row) });
    } catch (error) {
        console.error("[checkins] update failed", error);
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        return res.status(500).json({ message: "Không thể cập nhật check-in." });
    }
});

checkinsRoutes.delete("/", async (req, res) => {
    try {
        await requirePermission(req, "checkin.delete");

        const ids = await getAccessibleBranchIds(req);
        const checkinIds: string[] = Array.from(
            new Set<string>(
                Array.isArray(req.body?.ids)
                    ? req.body.ids.map((value: unknown) => String(value).trim()).filter(Boolean)
                    : [String(req.body?.id ?? "").trim()].filter(Boolean),
            ),
        );

        if (checkinIds.length === 0) {
            return res.status(400).json({ message: "Chưa chọn lượt check-in." });
        }

        const rows = await prisma.checkIn.findMany({
            where: { id: { in: checkinIds }, branchId: { in: ids } },
            include: { member: { select: { fullName: true, branchId: true } } },
        });

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy lượt check-in." });
        }

        const deletedIds = rows.map((row) => row.id);
        await prisma.checkIn.deleteMany({
            where: { id: { in: deletedIds } },
        });
        for (const row of rows) {
            await recordActivity({ req, action: "đã xóa check-in", entity: "checkin", entityId: row.id, targetName: row.member.fullName, branchId: row.member.branchId });
        }

        return res.json({ message: "Đã xóa lượt check-in.", deletedIds });
    } catch (error) {
        console.error("[checkins] delete failed", error);
        const s = (error as any)?.status;
        if (s) return res.status(s).json({ message: (error as any).message });
        return res.status(500).json({ message: "Không thể xóa check-in." });
    }
});
