"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get("identifier") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!identifier || !password) { setError("Vui lòng nhập đầy đủ email/số điện thoại và mật khẩu."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.message ?? "Đăng nhập thất bại."); return; }
      window.location.href = "/";
    } catch { setError("Không thể kết nối đến máy chủ."); }
    finally { setLoading(false); }
  }

  return <div className="card p-6 sm:p-8">
    <div className="mb-7"><h1 className="text-2xl font-bold">Đăng nhập</h1><p className="mt-2 text-sm text-[var(--muted)]">Đăng nhập vào hệ thống GymCRM.</p></div>
    {error && <div className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">{error}</div>}
    <form onSubmit={submit} className="space-y-4" noValidate>
      <label className="block text-sm font-semibold">Email hoặc số điện thoại<input name="identifier" className="field mt-2" placeholder="email@example.com hoặc 0912345678" autoComplete="username" /></label>
      <label className="block text-sm font-semibold">Mật khẩu<span className="relative mt-2 block"><input name="password" type={showPassword ? "text" : "password"} className="field pr-11" autoComplete="current-password" /><button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-subtle)]">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
      <button disabled={loading} className="btn btn-primary w-full justify-center py-2.5 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
    </form>
    <p className="mt-6 text-center text-sm text-[var(--muted)]">Chưa có tài khoản? <Link className="font-semibold text-[var(--primary)]" href="/register">Đăng ký</Link></p>
  </div>;
}
