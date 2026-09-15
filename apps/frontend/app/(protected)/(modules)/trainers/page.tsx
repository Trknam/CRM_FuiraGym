"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";

type Trainer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  status: "Đang hoạt động" | "Tạm nghỉ";
};

const emptyForm = { name: "", email: "", phone: "", specialty: "" };

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadTrainers() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/trainers", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể tải danh sách Trainer.");
      setTrainers(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrainers();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  }

  function openEdit(trainer: Trainer) {
    setEditing(trainer);
    setForm({ name: trainer.name, email: trainer.email, phone: trainer.phone, specialty: trainer.specialty, });
    setError("");
    setOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/trainers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...form, status: editing.status } : form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể lưu Trainer.");
      setOpen(false);
      await loadTrainers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu dữ liệu.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Trainer này sẽ được chuyển sang trạng thái Tạm nghỉ. Bạn có chắc không?")) return;
    setError("");
    try {
      const response = await fetch("/api/trainers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể cập nhật Trainer.");
      await loadTrainers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật dữ liệu.");
    }
  }

  const filtered = trainers.filter((trainer) =>
    [trainer.name, trainer.email, trainer.phone, trainer.specialty].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())),
  );

  return <>
    <PageTitle
      title="PT / Trainer"
      description="Quản lý huấn luyện viên trực tiếp trên PostgreSQL."
      action={<button className="btn btn-primary" onClick={openCreate}><Plus size={17} />Thêm Trainer</button>}
    />

    <div className="px-5 pb-8 md:px-8">
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 sm:max-w-md">
            <Search size={17} className="text-[var(--subtle)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Tìm Trainer..." />
          </div>
          <div className="text-xs text-[var(--muted)]">{filtered.length} / {trainers.length} Trainer trong DB</div>
        </div>

        <div className="overflow-x-auto">
          {loading ? <div className="p-12 text-center text-sm text-[var(--muted)]">Đang tải dữ liệu từ PostgreSQL...</div> : <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--muted)]"><tr><th className="px-5 py-3">Họ và tên</th><th>Email</th><th>Số điện thoại</th><th>Chuyên môn</th><th>Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead>
            <tbody>{filtered.map((trainer) => <tr className="table-row" key={trainer.id}>
              <td className="px-5 py-3 font-semibold">{trainer.name}</td><td>{trainer.email}</td><td>{trainer.phone}</td><td>{trainer.specialty || "—"}</td><td><span className={`badge ${trainer.status === "Đang hoạt động" ? "badge-success" : "badge-neutral"}`}>{trainer.status}</span></td>
              <td className="px-5 py-3"><div className="flex justify-end gap-1"><button aria-label="Sửa" className="btn btn-secondary !p-2" onClick={() => openEdit(trainer)}><Pencil size={15} /></button><button aria-label="Tạm nghỉ" className="btn btn-danger !p-2" onClick={() => remove(trainer.id)}><Trash2 size={15} /></button></div></td>
            </tr>)}</tbody>
          </table>}
          {!loading && filtered.length === 0 && <div className="p-12 text-center text-sm text-[var(--muted)]">Chưa có Trainer trong PostgreSQL.</div>}
        </div>
      </section>
    </div>

    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <form onSubmit={save} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between"><div><h2 className="text-lg font-bold">{editing ? "Sửa Trainer" : "Thêm Trainer"}</h2><p className="mt-1 text-xs text-[var(--muted)]">{editing ? "Thay đổi sẽ được cập nhật vào PostgreSQL." : "PT mới sẽ được lưu trực tiếp vào PostgreSQL."}</p></div><button type="button" className="btn btn-secondary !p-2" onClick={() => setOpen(false)}><X size={17} /></button></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {([['name','Họ và tên'],['email','Email'],['phone','Số điện thoại'],['specialty','Chuyên môn']] as const).map(([key, label]) => <label key={key} className="text-sm font-semibold">{label}<input required={key !== "specialty"} name={key} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="field mt-2" /></label>)}
          
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Hủy</button><button disabled={saving} className="btn btn-primary" type="submit">{saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo Trainer"}</button></div>
      </form>
    </div>}
  </>;
}
