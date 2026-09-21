"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRenewalToken = createRenewalToken;
exports.verifyRenewalToken = verifyRenewalToken;
const node_crypto_1 = __importDefault(require("node:crypto"));
const env_1 = require("../config/env");
function sign(value) {
    return node_crypto_1.default.createHmac("sha256", env_1.env.renewalSecret).update(value).digest("hex");
}
function createRenewalToken(membershipId, endDate) {
    const payload = {
        membershipId,
        endAt: endDate.getTime(),
        expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    };
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    return encoded + "." + sign(encoded);
}
function verifyRenewalToken(token, membershipId) {
    const [encoded, signature] = String(token ?? "").split(".");
    if (!encoded || !signature)
        return null;
    const expected = sign(encoded);
    if (signature.length !== expected.length)
        return null;
    if (!node_crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
        return null;
    try {
        const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
        if (payload.membershipId !== membershipId || payload.expiresAt < Date.now())
            return null;
        return payload;
    }
    catch {
        return null;
    }
}
