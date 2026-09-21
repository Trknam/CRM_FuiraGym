import type { Request } from "express";
import { prisma } from "../db/prisma";
import { getCurrentUser } from "../auth/session";

type ActivityInput = {
  req: Request;
  action: string;
  entity: string;
  entityId?: string | null;
  targetName?: string | null;
  details?: string | null;
  branchId?: string | null;
  notify?: boolean;
};

export async function recordActivity(input: ActivityInput) {
  try {
    const actor = await getCurrentUser(input.req);
    const actorName = actor?.fullName ?? "Hệ thống";
    const message = input.targetName
      ? actorName + " " + input.action + " cho " + input.targetName
      : actorName + " " + input.action;

    await prisma.auditLog.create({
      data: {
        actorUserId: actor?.id ?? null,
        branchId: input.branchId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        targetName: input.targetName ?? null,
        details: input.details ?? null,
      },
    });

    if (input.notify === false || !actor) return;

    const admins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN", isActive: true, approvalStatus: "ACTIVE" },
      select: { id: true },
    });
    const userIds = Array.from(new Set([actor.id, ...admins.map((item) => item.id)]));
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: "AUDIT",
        title: input.action,
        message,
        entity: input.entity,
        entityId: input.entityId ?? null,
      })),
    });
  } catch (error) {
    console.error("[activity] record failed", error);
  }
}

export async function recordSystemActivity(input: Omit<ActivityInput, "req" | "notify">) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: null,
        branchId: input.branchId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        targetName: input.targetName ?? null,
        details: input.details ?? null,
      },
    });
  } catch (error) {
    console.error("[activity] system record failed", error);
  }
}
