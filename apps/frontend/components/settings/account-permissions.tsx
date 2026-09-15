"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LockKeyhole, Plus, ShieldCheck, UserRound, X } from "lucide-react";

type Role = "SUPER_ADMIN" | "STAFF";
type UserRow = { id: string; fullName: string; email: string | null; phone: string | null; role: Role; roleLabel: string; isActive: boolean; createdAt: string };
type Permission = { key: string; label: string };
type RolePermissions = { role: Role; label: string; permissions: Permission[] };

const permissionGroups: Record<string, string> = { branch: "Phòng Gym", user: "Tài khoản & phân quyền", member: "Hội viên", lead: "Lead", crm: "CRM chăm sóc", payment: "Thanh toán", package: "Gói tập", checkin: "Check-in", trainer: "PT / Trainer", exercise: "Exercise Database", workout: "Giáo án", report: "Báo cáo", settings: "Cài đặt" };

export function AccountPermissions() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RolePermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ fullName: "", identifier: "", password: "", role: "STAFF" as Role, isActive: true });

  async function load() {
    setLoading(true); setError("");
    try {
      const [u, p] = await Promise.all([fetch("/api/users", { credentials: "include", cache: "no-store" }), fetch("/api/users/permissions", { credentials: "include", cache: "no-store" })]);
      const ud = await u.json(); const pd = await p.json();
      if (!u.ok) throw new Error(ud.message ?? "Không thể tải danh sách tài khoản.");
      if (!p.ok) throw new Error(pd.message ?? "Không thể tải cấu hình quyền.");
      setUsers(ud.data ?? []); setRoles(pd.roles ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải dữ liệu."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const staffPermissions = useMemo(() => roles.find((r) => r.role === "STAFF")?.permissions ?? [], [roles]);
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const permission of staffPermissions) { const group = permission.key.split(".")[0]; (groups[group] ??= []).push(permission); }
    return groups;
  }, [staffPermissions]);

  function openCreate() { setEditing(null); setCreating(true); setForm({ fullName: "", identifier: "", password: "", role: "STAFF", isActive: true }); }
  function openEdit(user: UserRow) { setCreating(false); setEditing(user); setForm({ fullName: user.fullName, identifier: user.email ?? user.phone ?? "", password: "", role: user.role, isActive: user.isActive }); }
  function closeForm() { setCreating(false); setEditing(null); }

  async function save() {
    setError("");
    const payload = creating ? { fullName: form.fullName, identifier: form.identifier, password: form.password, role: form.role } : { id: editing?.id, role: form.role, isActive: form.isActive, ...(form.password ? { password: form.password } : {}) };
    if (creating && (!form.fullName.trim() || !form.identifier.trim() || form.password.length < 8)) { setError("Vui lòng nhập đầy đủ họ tên, tài khoản và mật khẩu tối thiểu 8 ký tự."); return; }
    try {
      const response = await fetch("/api/users", { method: creating ? "POST" : "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Không thể lưu tài khoản.");
      closeForm(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu tài khoản."); }
  }

  async function lockUser(user: UserRow) {
    if (!confirm(`Khóa tài khoản ${user.fullName}?`)) return;
    try {
      const response = await fetch("/api/users", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message ?? "Không thể khóa tài khoản."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể khóa tài khoản."); }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Tài khoản & phân quyền</h1><p className="mt-1 text-sm text-[var(--muted)]">Chỉ quản trị viên có quyền quản lý tài khoản nhân viên.</p></div><button className="btn btn-primary" onClick={openCreate}><Plus size={17} />Tạo tài khoản</button></div>
    {error && <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</div>}
    <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[var(--border)] text-left"><th className="px-4 py-3">Tài khoản</th><th className="px-4 py-3">Liên hệ</th><th className="px-4 py-3">Vai trò</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead><tbody>{loading ? <tr><td className="px-4 py-8 text-center text-[var(--muted)]" colSpan={5}>Đang tải tài khoản...</td></tr> : users.map((user) => <tr key={user.id} className="border-b border-[var(--border)] last:border-0"><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="rounded-lg bg-[var(--surface-subtle)] p-2"><UserRound size={16} /></span><div><div className="font-semibold">{user.fullName}</div><div className="text-xs text-[var(--muted)]">{user.role === "SUPER_ADMIN" ? "Quản trị viên" : "Nhân viên"}</div></div></div></td><td className="px-4 py-3">{user.email ?? user.phone ?? "—"}</td><td className="px-4 py-3">{user.roleLabel}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5">{user.isActive ? <Check size={15} /> : <X size={15} />}{user.isActive ? "Đang hoạt động" : "Đã khóa"}</span></td><td className="px-4 py-3 text-right"><button className="btn btn-secondary mr-2" onClick={() => openEdit(user)}>Sửa</button>{user.isActive && <button className="btn btn-secondary" onClick={() => void lockUser(user)}><LockKeyhole size={15} />Khóa</button>}</td></tr>)}</tbody></table></div></div>
    <div className="card p-5"><div className="mb-4 flex items-center gap-2"><ShieldCheck size={19} /><h2 className="font-bold">Quyền mặc định của nhân viên</h2></div><div className="grid gap-4 md:grid-cols-2">{Object.entries(groupedPermissions).map(([group, permissions]) => <div key={group} className="rounded-xl border border-[var(--border)] p-4"><div className="mb-2 font-semibold">{permissionGroups[group] ?? group}</div><ul className="space-y-1 text-sm text-[var(--muted)]">{permissions.map((p) => <li key={p.key} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0" />{p.label}</li>)}</ul></div>)}</div></div>
    {(creating || editing) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="card w-full max-w-lg p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">{creating ? "Tạo tài khoản" : "Sửa tài khoản"}</h2><button onClick={closeForm}><X size={20} /></button></div><div className="space-y-4"><label className="block text-sm font-semibold">Họ và tên<input className="field mt-2" value={form.fullName} disabled={!creating} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label><label className="block text-sm font-semibold">Email hoặc số điện thoại<input className="field mt-2" value={form.identifier} disabled={!creating} onChange={(e) => setForm({ ...form, identifier: e.target.value })} /></label><label className="block text-sm font-semibold">Mật khẩu{!creating && <span className="ml-2 text-xs font-normal text-[var(--muted)]">để trống nếu không đổi</span>}<input className="field mt-2" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><label className="block text-sm font-semibold">Vai trò<select className="field mt-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}><option value="STAFF">Nhân viên</option><option value="SUPER_ADMIN">Quản trị hệ thống</option></select></label>{editing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Tài khoản đang hoạt động</label>}<div className="flex justify-end gap-2 pt-2"><button className="btn btn-secondary" onClick={closeForm}>Hủy</button><button className="btn btn-primary" onClick={() => void save()}>Lưu</button></div></div></div></div>}
  </div>;
}
