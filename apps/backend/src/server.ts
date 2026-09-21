import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { registerApiRoutes } from "./routes";
import { AuthError } from "./auth/authorization";
import { sendRenewalReminders, cancelExpiredRenewalPayments } from "./services/renewal-reminders";
import { recordActivity } from "./services/activity";
import { getCurrentUser } from "./auth/session";
import { syncMemberLifecycle } from "./services/member-lifecycle";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.set("trust proxy", 1);

app.get("/health", (_req, res) => res.json({ status: "ok", service: "gym-crm-backend" }));

app.use((req, res, next) => {
  const method = req.method.toUpperCase();
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) return next();
  if (
    req.path.startsWith("/api/auth") ||
    req.path.startsWith("/api/notifications") ||
    req.path.startsWith("/api/audit") ||
    req.path.startsWith("/api/members") ||
    req.path.startsWith("/api/checkins") ||
    req.path.startsWith("/api/users")
  ) return next();

  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    void (async () => {
      const user = await getCurrentUser(req);
      if (!user) return;
      const parts = req.path.split("/").filter(Boolean);
      const entity = parts[1] ?? "system";
      const actionMap: Record<string, string> = {
        POST: "đã tạo",
        PATCH: "đã cập nhật",
        PUT: "đã cập nhật",
        DELETE: "đã xóa",
      };
      await recordActivity({
        req,
        action: actionMap[method] + " " + entity,
        entity,
        entityId: String(req.body?.id ?? "").trim() || null,
        targetName: String(req.body?.name ?? req.body?.fullName ?? "").trim() || null,
      });
    })();
  });
  next();
});

registerApiRoutes(app);

setInterval(() => {
  void sendRenewalReminders().catch((error) => console.error("[renewal] job failed", error));
}, 24 * 60 * 60 * 1000);
void sendRenewalReminders().catch((error) => console.error("[renewal] startup job failed", error));

setInterval(() => {
  void cancelExpiredRenewalPayments().catch((error) =>
    console.error("[renewal-payment] cleanup failed", error),
  );
}, 30 * 1000);
void cancelExpiredRenewalPayments().catch((error) =>
  console.error("[renewal-payment] startup cleanup failed", error),
);

setInterval(() => {
  void syncMemberLifecycle().catch((error) =>
    console.error("[member-lifecycle] job failed", error),
  );
}, 60 * 60 * 1000);
void syncMemberLifecycle().catch((error) =>
  console.error("[member-lifecycle] startup job failed", error),
);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AuthError) {
    if (err.status === 401) {
      res.clearCookie("gymcrm_session", {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: "lax",
        path: "/",
      });
    }
    return res.status(err.status).json({ message: err.message });
  }
  console.error("Unhandled API error:", err);
  return res.status(500).json({ message: "Internal server error." });
});

app.use((_req, res) => res.status(404).json({ message: "API endpoint not found." }));

app.listen(env.port, () => {
  console.log(`Gym CRM backend listening on :${env.port}`);
});
