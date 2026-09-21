"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memberEmailTemplate = memberEmailTemplate;
exports.sendMemberBrandedEmail = sendMemberBrandedEmail;
exports.sendEmail = sendEmail;
exports.sendMemberEmail = sendMemberEmail;
exports.sendMemberPausedEmail = sendMemberPausedEmail;
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function memberEmailTemplate(memberName, content) {
    const appUrl = (process.env.PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
    const logoUrl = appUrl + "/FuiraGym.png";
    return ('<div style="margin:0;padding:32px 16px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">' +
        '<div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">' +
        '<div style="text-align:center;margin-bottom:28px"><img src="' + logoUrl + '" alt="FuiraGym" style="max-width:180px;max-height:70px;object-fit:contain" /></div>' +
        '<p style="font-size:16px;line-height:1.7;margin:0 0 20px">Kính gửi: <strong>' + escapeHtml(memberName) + '</strong></p>' +
        '<div style="font-size:16px;line-height:1.8">' + content + '</div>' +
        '</div>' +
        '</div>');
}
function sendMemberBrandedEmail(email, memberName, subject, content) {
    return sendMemberEmail(email, subject, memberEmailTemplate(memberName, content));
}
async function sendEmail(input) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!apiKey || !from) {
        console.warn("[email] RESEND_API_KEY or EMAIL_FROM not configured; email skipped");
        return false;
    }
    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + apiKey,
            },
            body: JSON.stringify({
                from,
                to: [input.to],
                subject: input.subject,
                html: input.html,
            }),
        });
        if (!response.ok) {
            console.error("[email] send failed", response.status, await response.text());
            return false;
        }
        const result = (await response.json());
        console.info("[email] sent", JSON.stringify({
            id: result.id ?? null,
            from,
            to: input.to,
            subject: input.subject,
        }));
        return true;
    }
    catch (error) {
        console.error("[email] send failed", error);
        return false;
    }
}
async function sendMemberEmail(email, subject, html) {
    if (!email)
        return false;
    return sendEmail({ to: email, subject, html });
}
async function sendMemberPausedEmail(email, memberName) {
    if (!email)
        return false;
    return sendMemberBrandedEmail(email, memberName, "Thông báo tạm nghỉ hội viên - FuiraGym", "<p>Cảm ơn anh/chị đã tin tưởng và đồng hành cùng FuiraGym. Chúc anh/chị sức khỏe.</p>");
}
