"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { validateRegister, ValidationErrors } from "@/lib/validation/auth";

export function RegisterForm() {
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError("");
        const form = new FormData(event.currentTarget);
        const input = {
            fullName: String(form.get("fullName") ?? ""),
            identifier: String(form.get("identifier") ?? ""),
            password: String(form.get("password") ?? ""),
            confirmPassword: String(form.get("confirmPassword") ?? ""),
        };
        const validation = validateRegister(input);
        setErrors(validation);
        if (Object.keys(validation).length) return;
        setLoading(true);
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            });
            const data = await response.json();
            if (!response.ok) {
                setFormError(data.message ?? "Đăng ký thất bại.");
                setErrors(data.errors ?? {});
                return;
            }
            window.location.href = "/";
        } catch {
            setFormError("Không thể kết nối đến máy chủ.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card p-6 sm:p-8">
            <div className="mb-7">
                <h1 className="text-2xl font-bold">Tạo tài khoản</h1>
                <p className="mt-2 text-sm text-[var(--muted)]">
                    Đăng ký tài khoản để sử dụng GymCRM.
                </p>
            </div>
            {formError && (
                <div className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
                    {formError}
                </div>
            )}
            <form className="space-y-4" onSubmit={submit} noValidate>
                <Field
                    label="Họ và tên"
                    name="fullName"
                    error={errors.fullName}
                    placeholder="Nguyễn Văn A"
                />
                <Field
                    label="Email hoặc số điện thoại"
                    name="identifier"
                    error={errors.identifier}
                    placeholder="email@example.com hoặc 0912345678"
                />
                <PasswordField
                    label="Mật khẩu"
                    name="password"
                    error={errors.password}
                    visible={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                />
                <PasswordField
                    label="Nhập lại mật khẩu"
                    name="confirmPassword"
                    error={errors.confirmPassword}
                    visible={showConfirm}
                    onToggle={() => setShowConfirm((v) => !v)}
                />
                <p className="text-xs leading-5 text-[var(--muted)]">
                    Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
                </p>
                <button
                    disabled={loading}
                    className="btn btn-primary w-full justify-center py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-[var(--muted)]">
                Đã có tài khoản?{" "}
                <Link className="font-semibold text-[var(--primary)]" href="/login">
                    Đăng nhập
                </Link>
            </p>
        </div>
    );
}

function Field({
    label,
    name,
    error,
    placeholder,
}: {
    label: string;
    name: string;
    error?: string;
    placeholder: string;
}) {
    return (
        <label className="block text-sm font-semibold">
            <span>{label}</span>
            <input
                name={name}
                className={`field mt-2 ${error ? "border-[var(--danger)]" : ""}`}
                placeholder={placeholder}
                autoComplete={name === "identifier" ? "email" : "name"}
            />
            {error && (
                <span className="mt-1 block text-xs font-normal text-[var(--danger)]">{error}</span>
            )}
        </label>
    );
}

function PasswordField({
    label,
    name,
    error,
    visible,
    onToggle,
}: {
    label: string;
    name: string;
    error?: string;
    visible: boolean;
    onToggle: () => void;
}) {
    return (
        <label className="block text-sm font-semibold">
            <span>{label}</span>
            <span className="relative mt-2 block">
                <input
                    name={name}
                    type={visible ? "text" : "password"}
                    className={`field pr-11 ${error ? "border-[var(--danger)]" : ""}`}
                    autoComplete="new-password"
                />
                <button
                    type="button"
                    aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={onToggle}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-subtle)]"
                >
                    {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
            </span>
            {error && (
                <span className="mt-1 block text-xs font-normal text-[var(--danger)]">{error}</span>
            )}
        </label>
    );
}
