"use client";

import { LogOut } from "lucide-react";
import { getRoleLabel } from "@/lib/auth/role-labels";
import { useAuth } from "@/components/auth/auth-context";

export function UserMenu() {
    const { user } = useAuth();

    async function logout() {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
                cache: "no-store",
            });
        } finally {
            window.location.replace("/login");
        }
    }

    const roleLabel = getRoleLabel(user.role);
    const initial = user.fullName.trim().charAt(0).toUpperCase() || "U";

    return (
        <div className="flex items-center gap-2 sm:flex">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary)]">
                {initial}
            </div>
            <div className="hidden leading-tight sm:block">
                <div className="text-sm font-semibold">{user.fullName}</div>
                <div className="text-[11px] text-[var(--muted)]">{roleLabel}</div>
            </div>
            <button
                onClick={logout}
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-white text-[var(--muted)] hover:bg-[var(--surface-subtle)]"
            >
                <LogOut size={16} />
            </button>
        </div>
    );
}
