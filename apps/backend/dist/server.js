"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const routes_1 = require("./routes");
const authorization_1 = require("./auth/authorization");
const renewal_reminders_1 = require("./services/renewal-reminders");
const activity_1 = require("./services/activity");
const session_1 = require("./auth/session");
const member_lifecycle_1 = require("./services/member-lifecycle");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));
app.use(express_1.default.json({ limit: "2mb" }));
app.use((0, cookie_parser_1.default)());
app.set("trust proxy", 1);
app.get("/health", (_req, res) => res.json({ status: "ok", service: "gym-crm-backend" }));
app.use((req, res, next) => {
    const method = req.method.toUpperCase();
    if (!["POST", "PATCH", "PUT", "DELETE"].includes(method))
        return next();
    if (req.path.startsWith("/api/auth") ||
        req.path.startsWith("/api/notifications") ||
        req.path.startsWith("/api/audit") ||
        req.path.startsWith("/api/members") ||
        req.path.startsWith("/api/checkins") ||
        req.path.startsWith("/api/users"))
        return next();
    res.on("finish", () => {
        if (res.statusCode >= 400)
            return;
        void (async () => {
            const user = await (0, session_1.getCurrentUser)(req);
            if (!user)
                return;
            const parts = req.path.split("/").filter(Boolean);
            const entity = parts[1] ?? "system";
            const actionMap = {
                POST: "đã tạo",
                PATCH: "đã cập nhật",
                PUT: "đã cập nhật",
                DELETE: "đã xóa",
            };
            await (0, activity_1.recordActivity)({
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
(0, routes_1.registerApiRoutes)(app);
setInterval(() => {
    void (0, renewal_reminders_1.sendRenewalReminders)().catch((error) => console.error("[renewal] job failed", error));
}, 24 * 60 * 60 * 1000);
void (0, renewal_reminders_1.sendRenewalReminders)().catch((error) => console.error("[renewal] startup job failed", error));
setInterval(() => {
    void (0, renewal_reminders_1.cancelExpiredRenewalPayments)().catch((error) => console.error("[renewal-payment] cleanup failed", error));
}, 30 * 1000);
void (0, renewal_reminders_1.cancelExpiredRenewalPayments)().catch((error) => console.error("[renewal-payment] startup cleanup failed", error));
setInterval(() => {
    void (0, member_lifecycle_1.syncMemberLifecycle)().catch((error) => console.error("[member-lifecycle] job failed", error));
}, 60 * 60 * 1000);
void (0, member_lifecycle_1.syncMemberLifecycle)().catch((error) => console.error("[member-lifecycle] startup job failed", error));
app.use((err, _req, res, _next) => {
    if (err instanceof authorization_1.AuthError) {
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
app.listen(env_1.env.port, () => {
    console.log(`Gym CRM backend listening on :${env_1.env.port}`);
});
