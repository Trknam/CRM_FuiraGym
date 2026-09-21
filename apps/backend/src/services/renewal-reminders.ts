import { prisma } from "../db/prisma";
import { sendMemberBrandedEmail } from "./email";
import { createRenewalToken } from "./renewal-token";
import { env } from "../config/env";

export async function cancelExpiredRenewalPayments() {
  const now = new Date();
  const result = await prisma.payment.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
      note: { startsWith: "RENEWAL:" },
    },
    data: { status: "CANCELLED" },
  });
  return result.count;
}

export async function sendRenewalReminders() {
  const now = new Date();
  const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const memberships = await prisma.membership.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gt: now, lte: until },
      renewalReminderSentAt: null,
      member: { email: { not: null }, status: "ACTIVE" },
    },
    include: {
      member: { select: { fullName: true, email: true } },
      package: { select: { name: true } },
    },
  });

  for (const membership of memberships) {
    const token = createRenewalToken(membership.id, membership.endDate);
    const renewalUrl =
      env.publicAppUrl.replace(/\/$/, "") +
      "/renewal?membership=" +
      encodeURIComponent(membership.id) +
      "&token=" +
      encodeURIComponent(token);
    const sent = await sendMemberBrandedEmail(
      membership.member.email,
      membership.member.fullName,
      "Nhắc gia hạn gói tập",
      "<p>Gói <b>" + membership.package.name + "</b> của anh/chị sẽ hết hạn vào <b>" +
        membership.endDate.toLocaleDateString("vi-VN") + "</b>.</p>" +
        "<p>Anh/chị có muốn gia hạn gói tập này không?</p>" +
        "<p><a href=\"" + renewalUrl + "&action=renew\" style=\"display:inline-block;padding:12px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:8px;\">Đồng ý gia hạn</a>" +
        "<a href=\"" + renewalUrl + "&action=dismiss\" style=\"display:inline-block;padding:12px 20px;background:#f3f4f6;color:#111827;text-decoration:none;border-radius:8px;font-weight:600;\">Suy nghĩ sau</a></p>" +
        "<p>Cảm ơn anh/chị đã tin tưởng và đến với <b>FuiraGym</b>.</p>" +
        "<p>Chúc anh/chị một ngày tốt lành.</p>",
    );
    if (sent) {
      await prisma.membership.update({
        where: { id: membership.id },
        data: { renewalReminderSentAt: new Date() },
      });
    }
  }
}




