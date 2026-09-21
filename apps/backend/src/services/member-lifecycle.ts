import { prisma } from "../db/prisma";
import { sendMemberBrandedEmail } from "./email";
import { recordSystemActivity } from "./activity";
import { cacheDelete } from "../cache/valkey";
import { cacheKeys } from "../cache/keys";

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
const INACTIVITY_DAYS = 5;

export async function syncMemberLifecycle() {
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - GRACE_PERIOD_MS);
  const inactivityCutoff = new Date(now.getTime() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.membership.updateMany({
    where: { status: "ACTIVE", endDate: { lt: now } },
    data: { status: "EXPIRED" },
  });

  const expiredMembers = await prisma.member.findMany({
    where: {
      status: { in: ["ACTIVE"] },
      memberships: {
        none: {
          status: "ACTIVE",
          endDate: { gte: now },
        },
        some: {
          status: "EXPIRED",
          endDate: { lt: graceCutoff },
        },
      },
    },
    include: {
      memberships: {
        where: { status: "EXPIRED" },
        orderBy: { endDate: "desc" },
        take: 1,
        include: { package: { select: { name: true } } },
      },
    },
  });

  for (const member of expiredMembers) {
    const membership = member.memberships[0];
    await prisma.$transaction([
      prisma.member.update({
        where: { id: member.id },
        data: { status: "INACTIVE" },
      }),
      prisma.membership.updateMany({
        where: { memberId: member.id, status: "EXPIRED" },
        data: { status: "CANCELLED" },
      }),
    ]);
    await cacheDelete(cacheKeys.members(member.branchId));
    await recordSystemActivity({
      action: "đã tự động chuyển hội viên sang Tạm nghỉ",
      entity: "member",
      entityId: member.id,
      targetName: member.fullName,
      branchId: member.branchId,
      details: membership
        ? "Gói " + membership.package.name + " đã hết hạn quá 7 ngày nhưng chưa được gia hạn."
        : "Hội viên không gia hạn gói trong thời gian chờ 7 ngày.",
    });
    void sendMemberBrandedEmail(
      member.email,
      member.fullName,
      "Thông báo chuyển trạng thái hội viên - FuiraGym",
      "<p>Gói tập của anh/chị đã hết hạn và sau 7 ngày chưa ghi nhận gia hạn mới.</p>" +
        "<p>Hệ thống FuiraGym đã tạm chuyển tài khoản hội viên sang trạng thái <b>Tạm nghỉ</b>. Khi anh/chị quay lại, nhân viên FuiraGym có thể hỗ trợ đăng ký gói tập mới và tiếp tục hành trình tập luyện.</p>" +
        "<p>Cảm ơn anh/chị đã tin tưởng và đồng hành cùng FuiraGym. Chúc anh/chị sức khỏe.</p>",
    );
  }

  const inactiveMembers = await prisma.member.findMany({
    where: {
      status: "ACTIVE",
      email: { not: null },
      lastInactivityReminderSentAt: null,
      checkIns: { none: { status: "VALID", checkedInAt: { gte: inactivityCutoff } } },
      memberships: {
        some: { status: "ACTIVE", startDate: { lte: now }, endDate: { gte: now } },
      },
    },
    select: { id: true, branchId: true, fullName: true, email: true },
  });

  for (const member of inactiveMembers) {
    const sent = await sendMemberBrandedEmail(
      member.email,
      member.fullName,
      "FuiraGym nhớ bạn - Đã đến lúc quay lại tập luyện",
      "<p><b>Đã lâu rồi FuiraGym chưa được gặp anh/chị!</b></p>" +
        "<p>Những ngày bận rộn đôi khi khiến chúng ta tạm quên mất việc chăm sóc sức khỏe. FuiraGym muốn nhắc anh/chị rằng chỉ cần một buổi tập nhỏ hôm nay cũng có thể là bước khởi đầu để quay lại với thói quen vận động.</p>" +
        "<p>Cơ thể khỏe mạnh cần được duy trì từng ngày. Hãy dành một chút thời gian cho bản thân, quay lại phòng tập, vận động và tiếp thêm năng lượng cho những ngày phía trước.</p>" +
        "<p><b>FuiraGym luôn sẵn sàng chào đón anh/chị trở lại.</b></p>" +
        "<p>Cảm ơn anh/chị đã tin tưởng và đồng hành cùng FuiraGym. Chúc anh/chị luôn khỏe mạnh và tràn đầy năng lượng!</p>",
    );
    if (sent) {
      await prisma.member.update({
        where: { id: member.id },
        data: { lastInactivityReminderSentAt: now },
      });
    }
  }
}