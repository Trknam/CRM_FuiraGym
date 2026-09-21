import { Router } from "express";
import { prisma } from "../db/prisma";
import { sendMemberBrandedEmail } from "../services/email";
import { verifyRenewalToken } from "../services/renewal-token";
import { env } from "../config/env";

export const publicRenewalRoutes = Router();

const PAYMENT_WINDOW_MS = 7 * 60 * 1000;

// TODO(GIA_HAN_THUC_TE):
// Khi FuiraGym tích hợp API/webhook ngân hàng, dùng webhook để xác nhận tiền về
// thay cho nút "Tôi đã thanh toán" ở frontend.
//
// Luồng thật dự kiến:
// 1. Ngân hàng/payment provider gọi POST /api/public/renewal/bank-webhook.
// 2. Backend xác thực chữ ký webhook.
// 3. Tìm Payment bằng mã giao dịch/nội dung chuyển khoản.
// 4. Kiểm tra đúng số tiền + đúng membershipId + chưa hết expiresAt.
// 5. Gọi renewAfterPayment(payment.id, membershipId).
//
// Ví dụ skeleton khi tích hợp provider:
//
// publicRenewalRoutes.post("/bank-webhook", async (req, res) => {
//   // const signature = req.header("x-webhook-signature");
//   // verifyBankSignature(req.body, signature);
//   // const { transactionId, amount, transferContent } = req.body;
//   // const payment = await findPendingRenewalPayment(transferContent);
//   // if (!payment || Number(payment.amount) !== Number(amount)) return res.status(400).end();
//   // await renewAfterPayment(payment.id, payment.membershipId!);
//   // return res.json({ received: true });
// });

function qrUrl(bankId: string, accountNo: string, accountName: string, amount: number, addInfo: string) {
  const params = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo: addInfo.slice(0, 25),
    accountName,
  });
  return (
    "https://img.vietqr.io/image/" +
    encodeURIComponent(bankId) +
    "-" +
    encodeURIComponent(accountNo) +
    "-compact2.png?" +
    params.toString()
  );
}

async function getPaymentQr(branchId: string, amount: number, memberCode: string) {
  const rows = await prisma.gymSetting.findMany({
    where: {
      branchId,
      name: { in: ["PAYMENT_BANK_ID", "PAYMENT_ACCOUNT_NO", "PAYMENT_ACCOUNT_NAME"] },
    },
  });
  const map = new Map(rows.map((x) => [x.name, x.value]));
  const bankId = String(map.get("PAYMENT_BANK_ID") ?? "MB").trim() || "MB";
  const accountNo = String(map.get("PAYMENT_ACCOUNT_NO") ?? "0377433503").trim() || "0377433503";
  const accountName = String(map.get("PAYMENT_ACCOUNT_NAME") ?? "Trần Khánh Nam").trim() || "Trần Khánh Nam";
  const addInfo = ("FU" + memberCode + " GIA HAN").slice(0, 25);
  return {
    qrUrl: qrUrl(bankId, accountNo, accountName, amount, addInfo),
    bankId,
    accountNo,
    accountName,
    addInfo,
  };
}

async function loadMembership(membershipId: string) {
  return prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      member: { select: { id: true, memberCode: true, fullName: true, email: true, branchId: true } },
      package: { select: { name: true, durationDays: true, price: true } },
    },
  });
}

async function renewAfterPayment(paymentId: string, membershipId: string) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { membership: { include: { package: true, member: true } } },
    });
    if (!payment || payment.membershipId !== membershipId || !payment.membership) {
      throw new Error("Không tìm thấy giao dịch gia hạn.");
    }
    if (payment.status === "CANCELLED") throw new Error("Mã QR đã hết hạn.");
    if (payment.note?.startsWith("RENEWAL_COMPLETED:")) {
      return {
        updated: payment.membership,
        membership: payment.membership,
        alreadyRenewed: true,
      };
    }
    if (payment.expiresAt && payment.expiresAt.getTime() <= now.getTime() && payment.status === "PENDING") {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
      throw new Error("Mã QR đã hết hạn. Yêu cầu gia hạn đã được hủy.");
    }
    if (payment.status === "PENDING") {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", paidAt: now },
      });
    } else if (payment.status !== "PAID") {
      throw new Error("Giao dịch chưa được xác nhận thanh toán.");
    }

    const membership = payment.membership;
    const baseDate = membership.endDate > now ? membership.endDate : now;
    const newEndDate = new Date(
      baseDate.getTime() + membership.package.durationDays * 24 * 60 * 60 * 1000,
    );
    const updated = await tx.membership.update({
      where: { id: membership.id },
      data: {
        endDate: newEndDate,
        status: "ACTIVE",
        renewalReminderSentAt: new Date(),
        note: "Gia hạn sau khi thanh toán QR ngày " + now.toLocaleDateString("vi-VN"),
      },
    });
    await tx.auditLog.create({
      data: {
        branchId: membership.member.branchId,
        action: "hội viên thanh toán và gia hạn gói tập",
        entity: "membership",
        entityId: membership.id,
        targetName: membership.member.fullName,
        details: "Gia hạn thêm " + membership.package.durationDays + " ngày.",
      },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { note: "RENEWAL_COMPLETED:" + membership.id },
    });
    return { updated, membership, alreadyRenewed: false };
  });
}

publicRenewalRoutes.post("/:membershipId", async (req, res) => {
  try {
    const membershipId = String(req.params.membershipId ?? "").trim();
    const token = String(req.body?.token ?? "").trim();
    const action = String(req.body?.action ?? "").trim().toLowerCase();
    const verified = verifyRenewalToken(token, membershipId);
    if (!verified) return res.status(400).json({ message: "Liên kết gia hạn không hợp lệ hoặc đã hết hạn." });

    const membership = await loadMembership(membershipId);
    if (!membership || !membership.member.email) {
      return res.status(404).json({ message: "Không tìm thấy thông tin hội viên." });
    }
    if (membership.endDate.getTime() !== verified.endAt) {
      return res.status(400).json({ message: "Gói tập đã được thay đổi. Vui lòng liên hệ trung tâm." });
    }

    if (action === "dismiss") {
      return res.json({ data: { action: "dismissed", message: "Đã đóng lựa chọn gia hạn." } });
    }
    if (action !== "renew") {
      return res.status(400).json({ message: "Thao tác gia hạn không hợp lệ." });
    }

    await prisma.payment.updateMany({
      where: { membershipId, status: "PENDING", note: { startsWith: "RENEWAL:" } },
      data: { status: "CANCELLED" },
    });

    const expiresAt = new Date(Date.now() + PAYMENT_WINDOW_MS);
    const payment = await prisma.payment.create({
      data: {
        branchId: membership.member.branchId,
        memberId: membership.member.id,
        membershipId,
        amount: membership.package.price,
        method: "BANK_TRANSFER",
        status: "PENDING",
        expiresAt,
        note: "RENEWAL:" + membershipId,
      },
    });
    const qr = await getPaymentQr(
      membership.member.branchId,
      Number(membership.package.price),
      membership.member.memberCode,
    );

    return res.json({
      data: {
        action: "payment_required",
        paymentId: payment.id,
        amount: Number(membership.package.price),
        packageName: membership.package.name,
        expiresAt,
        ...qr,
        message: "Vui lòng thanh toán trong 7 phút để hoàn tất gia hạn.",
      },
    });
  } catch (error) {
    console.error("[renewal] create payment failed", error);
    return res.status(500).json({ message: "Không thể tạo yêu cầu thanh toán gia hạn." });
  }
});

publicRenewalRoutes.post("/:membershipId/payment", async (req, res) => {
  try {
    const membershipId = String(req.params.membershipId ?? "").trim();
    const paymentId = String(req.body?.paymentId ?? "").trim();
    const token = String(req.body?.token ?? "").trim();
    const verified = verifyRenewalToken(token, membershipId);
    if (!verified) return res.status(400).json({ message: "Liên kết gia hạn không hợp lệ." });

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, membershipId, note: { startsWith: "RENEWAL:" } },
    });
    if (!payment) return res.status(404).json({ message: "Không tìm thấy giao dịch gia hạn." });
    if (payment.expiresAt && payment.expiresAt.getTime() <= Date.now() && payment.status === "PENDING") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
      return res.status(410).json({ message: "Mã QR đã hết hạn. Yêu cầu gia hạn đã được hủy." });
    }
    if (payment.status === "CANCELLED") {
      return res.status(410).json({ message: "Yêu cầu gia hạn đã bị hủy." });
    }

    const result = await renewAfterPayment(payment.id, membershipId);
    const admins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN", isActive: true, approvalStatus: "ACTIVE" },
      select: { id: true },
    });
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "MEMBERSHIP_RENEWAL",
          title: "Hội viên đã thanh toán gia hạn",
          message: result.membership.member.fullName + " đã thanh toán và gia hạn gói " + result.membership.package.name + ".",
          entity: "membership",
          entityId: membershipId,
        })),
      });
    }

    if (!result.alreadyRenewed) {
      await sendMemberBrandedEmail(
        result.membership.member.email,
        result.membership.member.fullName,
        "Gia hạn gói tập thành công",
        "<p>Gói <b>" + result.membership.package.name + "</b> của anh/chị đã được gia hạn thành công.</p>" +
          "<p>Ngày hết hạn mới: <b>" + result.updated.endDate.toLocaleDateString("vi-VN") + "</b>.</p>" +
          "<p>Cảm ơn anh/chị đã tin tưởng và đến với <b>FuiraGym</b>.</p>" +
          "<p>Chúc anh/chị một ngày tốt lành.</p>",
      );
    }

    return res.json({
      data: {
        action: "renewed",
        endDate: result.updated.endDate,
        message: "Thanh toán thành công. Gói tập đã được gia hạn.",
      },
    });
  } catch (error) {
    console.error("[renewal] payment confirmation failed", error);
    return res.status(500).json({ message: error instanceof Error ? error.message : "Không thể hoàn tất gia hạn." });
  }
});

// TẠM THỜI CHO ĐỒ ÁN:
// Chưa có API/webhook ngân hàng nên nút "Tôi đã thanh toán" gọi endpoint trên
// để mô phỏng việc payment provider đã xác nhận tiền về.
// Khi tích hợp thanh toán thật, KHÔNG cho hội viên gọi endpoint này trực tiếp;
// chuyển sang webhook đã xác thực ở TODO phía trên.