"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerApiRoutes = registerApiRoutes;
const members_1 = require("./members");
const auth_1 = require("./auth");
const packages_1 = require("./packages");
const checkins_1 = require("./checkins");
const leads_1 = require("./leads");
const payments_1 = require("./payments");
const trainers_1 = require("./trainers");
const exercises_1 = require("./exercises");
const crm_1 = require("./crm");
const settings_1 = require("./settings");
const reports_1 = require("./reports");
const workouts_1 = require("./workouts");
const dashboard_1 = require("./dashboard");
const users_1 = require("./users");
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
const branches_1 = require("../api/branches");
function registerApiRoutes(app) {
    app.get("/api/branches", async (req, res) => {
        try {
            await (0, authorization_1.requireUser)(req);
            const mainBranchId = await (0, branches_1.getMainBranchId)();
            const rows = await prisma_1.prisma.branch.findMany({
                where: { id: mainBranchId, isActive: true },
                orderBy: { name: "asc" },
                select: { id: true, name: true },
            });
            return res.json({ data: rows });
        }
        catch {
            return res.status(500).json({ message: "Không thể lấy danh sách chi nhánh." });
        }
    });
    app.use("/api/auth", auth_1.authRoutes);
    app.use("/api/members", members_1.membersRoutes);
    app.use("/api/packages", packages_1.packagesRoutes);
    app.use("/api/checkins", checkins_1.checkinsRoutes);
    app.use("/api/leads", leads_1.leadsRoutes);
    app.use("/api/payments", payments_1.paymentsRoutes);
    app.use("/api/trainers", trainers_1.trainersRoutes);
    app.use("/api/exercises", exercises_1.exercisesRoutes);
    app.use("/api/crm", crm_1.crmRoutes);
    app.use("/api/settings", settings_1.settingsRoutes);
    app.use("/api/reports", reports_1.reportsRoutes);
    app.use("/api/workouts", workouts_1.workoutsRoutes);
    app.use("/api/dashboard", dashboard_1.dashboardRoutes);
    app.use("/api/users", users_1.usersRoutes);
}
