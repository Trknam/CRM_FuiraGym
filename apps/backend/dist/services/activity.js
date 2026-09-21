"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordActivity = recordActivity;
exports.recordSystemActivity = recordSystemActivity;
const prisma_1 = require("../db/prisma");
const session_1 = require("../auth/session");
async function recordActivity(input) {
    try {
        const actor = await (0, session_1.getCurrentUser)(input.req);
        const actorName = actor?.fullName ?? "Hệ thống";
        const message = input.targetName
            ? actorName + " " + input.action + " cho " + input.targetName
            : actorName + " " + input.action;
        await prisma_1.prisma.auditLog.create({
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
        if (input.notify === false || !actor)
            return;
        const admins = await prisma_1.prisma.user.findMany({
            where: { role: "SUPER_ADMIN", isActive: true, approvalStatus: "ACTIVE" },
            select: { id: true },
        });
        const userIds = Array.from(new Set([actor.id, ...admins.map((item) => item.id)]));
        await prisma_1.prisma.notification.createMany({
            data: userIds.map((userId) => ({
                userId,
                type: "AUDIT",
                title: input.action,
                message,
                entity: input.entity,
                entityId: input.entityId ?? null,
            })),
        });
    }
    catch (error) {
        console.error("[activity] record failed", error);
    }
}
async function recordSystemActivity(input) {
    try {
        await prisma_1.prisma.auditLog.create({
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
    }
    catch (error) {
        console.error("[activity] system record failed", error);
    }
}
