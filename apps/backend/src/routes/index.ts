import type { Express } from "express";
import { membersRoutes } from "./members";
import { authRoutes } from "./auth";
import { packagesRoutes } from "./packages";
import { checkinsRoutes } from "./checkins";
import { leadsRoutes } from "./leads";
import { paymentsRoutes } from "./payments";
import { trainersRoutes } from "./trainers";
import { exercisesRoutes } from "./exercises";
import { crmRoutes } from "./crm";
import { settingsRoutes } from "./settings";
import { reportsRoutes } from "./reports";
import { workoutsRoutes } from "./workouts";
import { dashboardRoutes } from "./dashboard";
import { usersRoutes } from "./users";
import { prisma } from "../db/prisma";
import { requireUser } from "../auth/authorization";
import { getMainBranchId } from "../api/branches";

export function registerApiRoutes(app: Express) {
  app.get("/api/branches", async (req, res) => {
    try {
      await requireUser(req);
      const mainBranchId = await getMainBranchId();
      const rows = await prisma.branch.findMany({
        where: { id: mainBranchId, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      return res.json({ data: rows });
    } catch {
      return res.status(500).json({ message: "Không thể lấy danh sách chi nhánh." });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/members", membersRoutes);
  app.use("/api/packages", packagesRoutes);
  app.use("/api/checkins", checkinsRoutes);
  app.use("/api/leads", leadsRoutes);
  app.use("/api/payments", paymentsRoutes);
  app.use("/api/trainers", trainersRoutes);
  app.use("/api/exercises", exercisesRoutes);
  app.use("/api/crm", crmRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/workouts", workoutsRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/users", usersRoutes);
}