import crypto from "node:crypto";
import { env } from "../config/env";

type RenewalTokenPayload = {
  membershipId: string;
  endAt: number;
  expiresAt: number;
};

function sign(value: string) {
  return crypto.createHmac("sha256", env.renewalSecret).update(value).digest("hex");
}

export function createRenewalToken(membershipId: string, endDate: Date) {
  const payload: RenewalTokenPayload = {
    membershipId,
    endAt: endDate.getTime(),
    expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return encoded + "." + sign(encoded);
}

export function verifyRenewalToken(token: string, membershipId: string) {
  const [encoded, signature] = String(token ?? "").split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as RenewalTokenPayload;
    if (payload.membershipId !== membershipId || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}