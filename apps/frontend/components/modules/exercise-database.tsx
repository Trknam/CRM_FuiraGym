"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Filter,
    Pencil,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";

type Exercise = {
    id: string;
    name: string;
    muscle: string;
    equipment: string;
    level: string;
    description: string;
};

const PAGE_SIZE = 20;
const LEVELS = ["Tất cả trình độ", "Beginner", "Intermediate", "Advanced"];
const SORTS = ["Tên A → Z", "Tên Z → A", "Trình độ", "Nhóm cơ"];

const normalize = (value: unknown) =>
    String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");

export function ExerciseDatabase() {
    const [items, setItems] = useState<Exercise[]>([]);
    const [query, setQuery] = useState("");
    const [muscle, setMuscle] = useState("Tất cả nhóm cơ");
    const [level, setLevel] = useState(LEVELS[0]);
    const [equipment, setEquipment] = useState("Tất cả thiết bị");
    const [sort, setSort] = useState(SORTS[0]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState<Exercise | null>(null);
    const [open, setOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(true);

    async function loadItems() {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/exercises", { cache: "no-store" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể tải kho bài tập.");
            setItems(result.data ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Không thể tải kho bài tập.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadItems();
    }, []);
    useEffect(() => {
        setPage(1);
    }, [query, muscle, level, equipment, sort]);

    const muscles = useMemo(() => {
        const values = new Set(
            items.flatMap((item) =>
                item.muscle
                    .split(/[,;/]+/)
                    .map((value) => value.trim())
                    .filter(Boolean),
            ),
        );
        return ["Tất cả nhóm cơ", ...Array.from(values).sort((a, b) => a.localeCompare(b, "vi"))];
    }, [items]);

    const equipments = useMemo(() => {
        const values = new Set(
            items.flatMap((item) =>
                item.equipment
                    .split(/[,;/]+/)
                    .map((value) => value.trim())
                    .filter(Boolean),
            ),
        );
        return ["Tất cả thiết bị", ...Array.from(values).sort((a, b) => a.localeCompare(b, "vi"))];
    }, [items]);

    const filtered = useMemo(() => {
        const q = normalize(query.trim());
        const result = items.filter((item) => {
            const searchable = normalize(
                `${item.name} ${item.muscle} ${item.equipment} ${item.level} ${item.description}`,
            );
            const matchesQuery = !q || searchable.includes(q);
            const matchesMuscle =
                muscle === "Tất cả nhóm cơ" || normalize(item.muscle).includes(normalize(muscle));
            const matchesLevel = level === "Tất cả trình độ" || item.level === level;
            const matchesEquipment =
                equipment === "Tất cả thiết bị" ||
                normalize(item.equipment).includes(normalize(equipment));
            return matchesQuery && matchesMuscle && matchesLevel && matchesEquipment;
        });

        return result.sort((a, b) => {
            if (sort === "Tên Z → A") return b.name.localeCompare(a.name, "vi");
            if (sort === "Trình độ")
                return a.level.localeCompare(b.level) || a.name.localeCompare(b.name, "vi");
            if (sort === "Nhóm cơ")
                return a.muscle.localeCompare(b.muscle, "vi") || a.name.localeCompare(b.name, "vi");
            return a.name.localeCompare(b.name, "vi");
        });
    }, [items, query, muscle, level, equipment, sort]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const stats = useMemo(
        () => ({
            total: items.length,
            beginner: items.filter((x) => x.level === "Beginner").length,
            intermediate: items.filter((x) => x.level === "Intermediate").length,
            muscleGroups: muscles.length - 1,
        }),
        [items, muscles.length],
    );

    const openCreate = () => {
        setEditing(null);
        setError("");
        setOpen(true);
    };
    const openEdit = (item: Exercise) => {
        setEditing(item);
        setError("");
        setOpen(true);
    };

    async function remove(id: string) {
        if (!window.confirm("Bạn có chắc muốn xóa bài tập này khỏi Exercise Database?")) return;
        try {
            const response = await fetch("/api/exercises", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể xóa bài tập.");
            setItems((current) => current.filter((item) => item.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Không thể xóa bài tập.");
        }
    }

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError("");
        const form = new FormData(event.currentTarget);
        const values = {
            name: String(form.get("name") ?? "").trim(),
            muscle: String(form.get("muscle") ?? "").trim(),
            equipment: String(form.get("equipment") ?? "").trim(),
            level: String(form.get("level") ?? "Beginner"),
            description: String(form.get("description") ?? "").trim(),
        };
        try {
            const response = await fetch("/api/exercises", {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editing ? { id: editing.id, ...values } : values),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể lưu bài tập.");
            const saved = result.data as Exercise;
            setItems((current) =>
                editing
                    ? current.map((item) => (item.id === editing.id ? saved : item))
                    : [saved, ...current],
            );
            setOpen(false);
            setPage(1);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Không thể lưu bài tập.");
        } finally {
            setSaving(false);
        }
    }

    const resetFilters = () => {
        setQuery("");
        setMuscle("Tất cả nhóm cơ");
        setLevel(LEVELS[0]);
        setEquipment("Tất cả thiết bị");
        setSort(SORTS[0]);
        setPage(1);
    };

    return (
        <>
            <PageTitle
                title="Exercise Database"
                description="Kho bài tập tập trung cho nhân viên tra cứu nhanh và AI Workout Planner chọn bài an toàn."
                action={
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={17} />
                        Thêm bài tập
                    </button>
                }
            />

            <div className="px-5 pb-8 md:px-8">
                {error && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        ["Tổng bài tập", stats.total, "Toàn bộ bài đang hoạt động"],
                        ["Beginner", stats.beginner, "Dễ tra cứu cho khách mới"],
                        ["Intermediate", stats.intermediate, "Bài mức trung bình"],
                        ["Nhóm cơ", stats.muscleGroups, "Có thể lọc theo nhóm cơ"],
                    ].map(([label, value, note]) => (
                        <div className="card px-4 py-4" key={String(label)}>
                            <div className="text-xs font-semibold text-[var(--muted)]">{label}</div>
                            <div className="mt-1 text-2xl font-bold">{value}</div>
                            <div className="mt-1 text-xs text-[var(--subtle)]">{note}</div>
                        </div>
                    ))}
                </div>

                <section className="card overflow-hidden">
                    <div className="border-b border-[var(--border)] p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2.5 lg:max-w-xl">
                                <Search size={18} className="shrink-0 text-[var(--subtle)]" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="w-full bg-transparent text-sm outline-none"
                                    placeholder="Tìm tên bài, nhóm cơ, thiết bị, trình độ..."
                                />
                                {query && (
                                    <button
                                        className="text-[var(--subtle)]"
                                        onClick={() => setQuery("")}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <button
                                className={`btn ${showFilters ? "btn-primary" : "btn-secondary"}`}
                                onClick={() => setShowFilters((value) => !value)}
                            >
                                <SlidersHorizontal size={16} />
                                Bộ lọc
                            </button>
                            <button className="btn btn-secondary" onClick={resetFilters}>
                                <Filter size={16} />
                                Đặt lại
                            </button>
                            <div className="text-xs text-[var(--muted)] lg:ml-auto">
                                {loading
                                    ? "Đang tải..."
                                    : `${filtered.length} bài phù hợp / ${items.length} bài`}
                            </div>
                        </div>

                        {showFilters && (
                            <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 md:grid-cols-2 xl:grid-cols-4">
                                <label className="text-xs font-semibold text-[var(--muted)]">
                                    Nhóm cơ
                                    <select
                                        value={muscle}
                                        onChange={(e) => setMuscle(e.target.value)}
                                        className="field mt-1.5"
                                    >
                                        <option>Tất cả nhóm cơ</option>
                                        {muscles.slice(1).map((value) => (
                                            <option key={value}>{value}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-xs font-semibold text-[var(--muted)]">
                                    Trình độ
                                    <select
                                        value={level}
                                        onChange={(e) => setLevel(e.target.value)}
                                        className="field mt-1.5"
                                    >
                                        {LEVELS.map((value) => (
                                            <option key={value}>{value}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-xs font-semibold text-[var(--muted)]">
                                    Thiết bị
                                    <select
                                        value={equipment}
                                        onChange={(e) => setEquipment(e.target.value)}
                                        className="field mt-1.5"
                                    >
                                        <option>Tất cả thiết bị</option>
                                        {equipments.slice(1).map((value) => (
                                            <option key={value}>{value}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-xs font-semibold text-[var(--muted)]">
                                    Sắp xếp
                                    <select
                                        value={sort}
                                        onChange={(e) => setSort(e.target.value)}
                                        className="field mt-1.5"
                                    >
                                        {SORTS.map((value) => (
                                            <option key={value}>{value}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-14 text-center text-sm text-[var(--muted)]">
                                Đang tải Exercise Database từ PostgreSQL...
                            </div>
                        ) : (
                            <table className="w-full min-w-[1050px] text-left text-sm">
                                <thead className="bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--muted)]">
                                    <tr>
                                        <th className="px-5 py-3">Bài tập</th>
                                        <th className="px-5 py-3">Nhóm cơ</th>
                                        <th className="px-5 py-3">Thiết bị</th>
                                        <th className="px-5 py-3">Trình độ</th>
                                        <th className="px-5 py-3">Mô tả</th>
                                        <th className="px-5 py-3 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((item) => (
                                        <tr className="table-row" key={item.id}>
                                            <td className="px-5 py-3.5">
                                                <div className="font-semibold">{item.name}</div>
                                                <div className="mt-0.5 text-[11px] text-[var(--subtle)]">
                                                    ID: {item.id.slice(0, 10)}...
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="badge badge-neutral">
                                                    {item.muscle}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-[var(--muted)]">
                                                {item.equipment || "Không yêu cầu"}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span
                                                    className={
                                                        item.level === "Beginner"
                                                            ? "badge badge-success"
                                                            : item.level === "Intermediate"
                                                              ? "badge badge-warning"
                                                              : "badge badge-danger"
                                                    }
                                                >
                                                    {item.level}
                                                </span>
                                            </td>
                                            <td className="max-w-xs px-5 py-3.5 text-xs text-[var(--muted)]">
                                                <span className="line-clamp-2">
                                                    {item.description || "Chưa có mô tả"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        aria-label="Sửa bài tập"
                                                        className="btn btn-secondary !p-2"
                                                        onClick={() => openEdit(item)}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        aria-label="Xóa bài tập"
                                                        className="btn btn-danger !p-2"
                                                        onClick={() => remove(item.id)}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {!loading && visible.length === 0 && (
                            <div className="p-14 text-center">
                                <div className="text-sm font-semibold">Không tìm thấy bài tập</div>
                                <div className="mt-1 text-xs text-[var(--muted)]">
                                    Thử đổi từ khóa hoặc nới bộ lọc.
                                </div>
                                <button className="btn btn-secondary mt-4" onClick={resetFilters}>
                                    Xóa bộ lọc
                                </button>
                            </div>
                        )}
                    </div>

                    {!loading && filtered.length > 0 && (
                        <div className="flex flex-col gap-3 border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
                            <span>
                                Hiển thị {(safePage - 1) * PAGE_SIZE + 1}–
                                {Math.min(safePage * PAGE_SIZE, filtered.length)} trên{" "}
                                {filtered.length} bài
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={safePage === 1}
                                    className="btn btn-secondary !p-2 disabled:cursor-not-allowed disabled:opacity-40"
                                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="px-3 font-semibold text-[var(--foreground)]">
                                    Trang {safePage} / {totalPages}
                                </span>
                                <button
                                    disabled={safePage === totalPages}
                                    className="btn btn-secondary !p-2 disabled:cursor-not-allowed disabled:opacity-40"
                                    onClick={() =>
                                        setPage((value) => Math.min(totalPages, value + 1))
                                    }
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {open && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
                    onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
                >
                    <form
                        onSubmit={save}
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold">
                                    {editing ? "Sửa bài tập" : "Thêm bài tập"}
                                </h2>
                                <p className="mt-1 text-xs text-[var(--muted)]">
                                    Bài tập lưu trực tiếp vào PostgreSQL và sẽ được AI Workout sử
                                    dụng.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="btn btn-secondary !p-2"
                                onClick={() => setOpen(false)}
                            >
                                <X size={17} />
                            </button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-semibold sm:col-span-2">
                                Tên bài tập *
                                <input
                                    required
                                    name="name"
                                    defaultValue={editing?.name ?? ""}
                                    className="field mt-2"
                                    placeholder="Ví dụ: Cable Chest Fly"
                                />
                            </label>
                            <label className="text-sm font-semibold">
                                Nhóm cơ *
                                <input
                                    required
                                    name="muscle"
                                    defaultValue={editing?.muscle ?? ""}
                                    className="field mt-2"
                                    placeholder="Chest, Triceps"
                                />
                            </label>
                            <label className="text-sm font-semibold">
                                Thiết bị
                                <input
                                    name="equipment"
                                    defaultValue={editing?.equipment ?? ""}
                                    className="field mt-2"
                                    placeholder="Cable Machine"
                                />
                            </label>
                            <label className="text-sm font-semibold">
                                Trình độ
                                <select
                                    name="level"
                                    defaultValue={editing?.level ?? "Beginner"}
                                    className="field mt-2"
                                >
                                    {LEVELS.slice(1).map((value) => (
                                        <option key={value}>{value}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-sm font-semibold sm:col-span-2">
                                Mô tả
                                <textarea
                                    name="description"
                                    defaultValue={editing?.description ?? ""}
                                    className="field mt-2 min-h-24 resize-y"
                                    placeholder="Mô tả ngắn về kỹ thuật và mục tiêu của bài tập..."
                                />
                            </label>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setOpen(false)}
                            >
                                Hủy
                            </button>
                            <button disabled={saving} className="btn btn-primary" type="submit">
                                {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Thêm bài tập"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
