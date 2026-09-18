"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
    Check,
    CheckSquare,
    CirclePause,
    Ellipsis,
    Pencil,
    Plus,
    Search,
    Trash2,
    UserRoundX,
    X,
} from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";

export type Field = {
    key: string;
    label: string;
    type?: "text" | "number" | "date" | "datetime-local" | "select";
    options?: string[];
    optionsEndpoint?: string;
    allowEmptyOption?: boolean;
    required?: boolean;
    hiddenOnCreate?: boolean;
};
export type CrudItem = Record<string, string | number> & { id: string };

const displayFieldValue = (item: CrudItem, key: string) => {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
    if (key === "membershipStatus") return "Chưa có gói";
    return "—";
};

type Props = {
    title: string;
    description: string;
    action: string;
    moduleKey: string;
    fields: Field[];
    seed: CrudItem[];
    columns: string[];
    columnLabels?: Record<string, string>;
    readOnly?: boolean;
    removeActionLabel?: string;
    removeConfirmMessage?: string;
    removeIcon?: "pause" | "user-off" | "trash";
    bulkActionLabel?: string;
    bulkConfirmMessage?: string;
    rowAction?: {
        label: string;
        endpoint: string;
        method?: "POST" | "PATCH";
        icon?: ReactNode;
        confirmMessage?: string;
    };
    onCreate?: (values: Record<string, string | number>) => Promise<CrudItem | void>;
    refreshKey?: number;
};

const inputValue = (field: Field, value: unknown) => {
    const text = String(value ?? "");
    if (field.type === "datetime-local" && text) return text.slice(0, 16);
    if (field.type === "date" && text) return text.slice(0, 10);
    return text;
};

const statusTone = (value: string) => {
    const v = value.toLowerCase();
    if (
        v.includes("hoạt động") ||
        v.includes("đã thanh toán") ||
        v.includes("đã chuyển đổi") ||
        v.includes("đã tạo")
    )
        return "badge badge-success";
    if (
        v.includes("sắp") ||
        v.includes("chờ") ||
        v.includes("tiềm năng") ||
        v.includes("đang xử lý")
    )
        return "badge badge-warning";
    if (v.includes("hết") || v.includes("hủy") || v.includes("không") || v.includes("tạm nghỉ"))
        return "badge badge-danger";
    return "badge badge-neutral";
};

const displayValue = (field: Field | undefined, value: unknown) => {
    const text = String(value ?? "—");
    if (!field || !text || text === "—") return text || "—";
    if (field.type === "date") {
        const date = new Date(text);
        return Number.isNaN(date.getTime()) ? text : date.toLocaleDateString("vi-VN");
    }
    if (field.type === "datetime-local") {
        const date = new Date(text);
        return Number.isNaN(date.getTime())
            ? text
            : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
    }
    return text;
};

export function CrudModulePage({
    title,
    description,
    action,
    moduleKey,
    fields,
    seed,
    columns,
    columnLabels = {},
    readOnly = false,
    removeActionLabel = "Xóa",
    removeConfirmMessage = "Bạn có chắc muốn xóa bản ghi này?",
    removeIcon = "pause",
    bulkActionLabel = removeActionLabel,
    bulkConfirmMessage = removeConfirmMessage,
    rowAction,
    onCreate,
    refreshKey = 0,
}: Props) {
    const [items, setItems] = useState<CrudItem[]>([]);
    const [query, setQuery] = useState("");
    const [editing, setEditing] = useState<CrudItem | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [fieldOptions, setFieldOptions] = useState<
        Record<string, { value: string; label: string }[]>
    >({});
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

    const apiPath = `/api/${moduleKey}`;

    async function loadItems() {
        setLoading(true);
        setError("");
        try {
            const response = await fetch(apiPath, { cache: "no-store" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể tải dữ liệu.");
            let data = result.data as CrudItem[];

            if (data.length === 0 && seed.length > 0 && moduleKey === "legacy") {
                const seedResponse = await fetch(apiPath, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items: seed }),
                });
                if (seedResponse.ok) data = (await seedResponse.json()).data;
            }

            setItems(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadItems();
    }, [moduleKey, refreshKey]);

    useEffect(() => {
        let cancelled = false;
        async function loadOptions() {
            const fieldsWithEndpoints = fields.filter((field) => field.optionsEndpoint);
            const loaded = await Promise.all(
                fieldsWithEndpoints.map(async (field) => {
                    const response = await fetch(field.optionsEndpoint!, { cache: "no-store" });
                    if (!response.ok) throw new Error("Không thể tải lựa chọn cho " + field.label);
                    const result = await response.json();
                    return [
                        field.key,
                        (result.data ?? []).map((item: Record<string, unknown>) => ({
                            value: String(item.id),
                            label: String(item.name ?? item.fullName ?? item.id),
                        })),
                    ] as const;
                }),
            );
            if (!cancelled) setFieldOptions(Object.fromEntries(loaded));
        }
        loadOptions().catch((err) => {
            if (!cancelled)
                setError(err instanceof Error ? err.message : "Không thể tải dữ liệu lựa chọn.");
        });
        return () => {
            cancelled = true;
        };
    }, [fields]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) =>
            Object.values(item).some((v) => String(v).toLowerCase().includes(q)),
        );
    }, [items, query]);

    const toggleSelection = (id: string) => {
        setSelectedIds((current) =>
            current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
        );
    };

    const toggleSelectAll = () => {
        const ids = filtered.map((item) => item.id);
        setSelectedIds((current) =>
            ids.length > 0 && ids.every((id) => current.includes(id))
                ? current.filter((id) => !ids.includes(id))
                : Array.from(new Set([...current, ...ids])),
        );
    };

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedIds([]);
        setBulkMenuOpen(false);
    };

    const openCreate = () => {
        if (readOnly) {
            void loadItems();
            return;
        }
        setEditing(null);
        setError("");
        setOpen(true);
    };
    const openEdit = (item: CrudItem) => {
        setEditing(item);
        setError("");
        setOpen(true);
    };

    async function remove(id: string) {
        if (!window.confirm(removeConfirmMessage)) return;
        setError("");
        try {
            const response = await fetch(apiPath, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể xóa dữ liệu.");
            if (Array.isArray(result.deletedIds)) {
                setItems((current) => current.filter((item) => !result.deletedIds.includes(item.id)));
                return;
            }
            const updated = result.data as CrudItem | undefined;
            setItems((current) =>
                current.map((item) =>
                    item.id === id
                        ? updated ?? { ...item, status: "Tạm nghỉ" }
                        : item,
                ),
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Không thể xóa dữ liệu.");
        }
    }

    async function runRowAction(item: CrudItem) {
        if (rowAction?.confirmMessage && !window.confirm(rowAction.confirmMessage)) return;
        setError("");
        try {
            const response = await fetch(rowAction!.endpoint.replace(":id", item.id), {
                method: rowAction!.method ?? "POST",
                headers: { "Content-Type": "application/json" },
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể thực hiện thao tác.");
            if (result.data) {
                setItems((current) =>
                    current.map((currentItem) =>
                        currentItem.id === item.id ? (result.data as CrudItem) : currentItem,
                    ),
                );
            } else {
                await loadItems();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Không thể thực hiện thao tác.");
        }
    }

    async function bulkRemove() {
        if (selectedIds.length === 0) return;
        if (!window.confirm(bulkConfirmMessage + "\n\nSố lượng: " + selectedIds.length)) return;
        setError("");
        try {
            const response = await fetch(apiPath, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể xử lý dữ liệu.");
            if (Array.isArray(result.deletedIds)) {
                setItems((current) =>
                    current.filter((item) => !result.deletedIds.includes(item.id)),
                );
                exitSelectionMode();
                return;
            }
            const updatedItems = (result.data ?? []) as CrudItem[];
            const updatedMap = new Map(updatedItems.map((item) => [item.id, item]));
            setItems((current) =>
                current.map((item) =>
                    updatedMap.get(item.id) ??
                    (selectedIds.includes(item.id) ? { ...item, status: "Tạm nghỉ" } : item),
                ),
            );
            exitSelectionMode();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Không thể xử lý dữ liệu.");
        }
    }

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError("");
        const data = new FormData(event.currentTarget);
        const values: Record<string, string | number> = {};
        fields.forEach((field) => {
            const raw = String(data.get(field.key) ?? "").trim();
            values[field.key] = field.type === "number" ? Number(raw) : raw;
        });

        try {
            if (!editing && onCreate) {
                const saved = await onCreate(values);
                if (saved) {
                    setItems((current) => [saved, ...current]);
                }
                setOpen(false);
                return;
            }
            const response = await fetch(apiPath, {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editing ? { id: editing.id, ...values } : values),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể lưu dữ liệu.");
            const saved = result.data as CrudItem;
            setItems((current) =>
                editing
                    ? current.map((item) => (item.id === editing.id ? saved : item))
                    : [saved, ...current],
            );
            setOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Không thể lưu dữ liệu.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <PageTitle
                title={title}
                description={description}
                action={
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={17} />
                        {action}
                    </button>
                }
            />
            <div className="px-5 pb-8 md:px-8">
                {error && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
                <section className="card overflow-hidden">
                    <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 sm:max-w-md">
                            <Search size={17} className="text-[var(--subtle)]" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-transparent text-sm outline-none"
                                placeholder={`Tìm trong ${title.toLowerCase()}...`}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            {selectionMode && selectedIds.length > 0 && (
                                <span className="text-xs font-semibold text-[var(--muted)]">
                                    Đã chọn {selectedIds.length}
                                </span>
                            )}
                            {!readOnly && (
                                <div className="relative">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setBulkMenuOpen((value) => !value)}
                                    >
                                        <Ellipsis size={17} />
                                        {selectionMode ? "Đang chọn nhiều" : "Chọn nhiều"}
                                    </button>
                                    {bulkMenuOpen && (
                                        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-[var(--border)] bg-white p-1 shadow-lg">
                                            <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-subtle)]" onClick={() => { setSelectionMode(true); setSelectedIds(filtered.map((item) => item.id)); setBulkMenuOpen(false); }}>
                                                <CheckSquare size={16} /> Chọn tất cả
                                            </button>
                                            <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-subtle)]" onClick={() => { setSelectionMode(true); setSelectedIds([]); setBulkMenuOpen(false); }}>
                                                <Check size={16} /> Chọn thủ công
                                            </button>
                                            {selectionMode && selectedIds.length > 0 && (
                                                <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => { setBulkMenuOpen(false); void bulkRemove(); }}>
                                                    {removeIcon === "trash" ? <Trash2 size={16} /> : removeIcon === "user-off" ? <UserRoundX size={16} /> : <CirclePause size={16} />} {bulkActionLabel}
                                                </button>
                                            )}
                                            {selectionMode && (
                                                <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--muted)] hover:bg-[var(--surface-subtle)]" onClick={exitSelectionMode}>
                                                    Thoát chọn nhiều
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="text-xs text-[var(--muted)]">
                                {loading ? "Đang tải..." : `${filtered.length} / ${items.length} bản ghi`}
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 text-center text-sm text-[var(--muted)]">
                                Đang tải dữ liệu...
                            </div>
                        ) : (
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--muted)]">
                                    <tr>
                                        {selectionMode && (
                                            <th className="w-12 px-5 py-3">
                                                <input type="checkbox" aria-label="Chọn tất cả" checked={filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id))} onChange={toggleSelectAll} />
                                            </th>
                                        )}
                                        {columns.map((key) => (
                                            <th key={key} className="px-5 py-3">
                                                {columnLabels[key] ??
                                                    fields.find((f) => f.key === key)?.label ??
                                                    key}
                                            </th>
                                        ))}
                                        {!readOnly && (
                                            <th className="px-5 py-3 text-right">Thao tác</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((item) => (
                                        <tr className="table-row" key={item.id}>
                                            {selectionMode && (
                                                <td className="px-5 py-3">
                                                    <input type="checkbox" aria-label={"Chọn " + displayFieldValue(item, columns[0])} checked={selectedIds.includes(item.id)} onChange={() => toggleSelection(item.id)} />
                                                </td>
                                            )}
                                            {columns.map((key, index) => {
                                                const field = fields.find((f) => f.key === key);
                                                const rawValue = displayFieldValue(item, key);
                                                const value = displayValue(field, rawValue);
                                                return (
                                                    <td key={key} className="px-5 py-3">
                                                        {index === 0 ? (
                                                            <span className="font-semibold">
                                                                {value}
                                                            </span>
                                                        ) : field?.options ||
                                                          field?.optionsEndpoint ? (
                                                            <span className={statusTone(value)}>
                                                                {value}
                                                            </span>
                                                        ) : (
                                                            value
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            {!readOnly && (
                                                <td className="px-5 py-3">
                                                    <div className="flex justify-end gap-1">
                                                        {rowAction &&
                                                            item.status === "Chờ thanh toán" && (
                                                                <button
                                                                    aria-label={rowAction.label}
                                                                    className="btn btn-primary !p-2"
                                                                    onClick={() => runRowAction(item)}
                                                                >
                                                                    {rowAction.icon ?? <Check size={15} />}
                                                                </button>
                                                            )}
                                                        <button
                                                            aria-label="Sửa"
                                                            className="btn btn-secondary !p-2"
                                                            onClick={() => openEdit(item)}
                                                        >
                                                            <Pencil size={15} />
                                                        </button>
                                                        <button
                                                            aria-label={removeActionLabel}
                                                            className="btn btn-danger !p-2"
                                                            onClick={() => remove(item.id)}
                                                        >
                                                            {removeIcon === "trash" ? (
                                                                <Trash2 size={15} />
                                                            ) : removeIcon === "user-off" ? (
                                                                <UserRoundX size={15} />
                                                            ) : (
                                                                <CirclePause size={15} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {!loading && filtered.length === 0 && (
                            <div className="p-12 text-center text-sm text-[var(--muted)]">
                                Không có dữ liệu.
                            </div>
                        )}
                    </div>
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
                                    {editing ? `Sửa ${title}` : action}
                                </h2>
                                <p className="mt-1 text-xs text-[var(--muted)]">
                                    Nhập thông tin và lưu thay đổi.
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
                            {fields
                                .filter((field) => !(field.hiddenOnCreate && !editing))
                                .map((field) => {
                                const options = field.optionsEndpoint
                                    ? (fieldOptions[field.key] ?? [])
                                    : (field.options ?? []).map((option) => ({
                                          value: option,
                                          label: option,
                                      }));
                                const currentValue = inputValue(
                                    field,
                                    editing?.[field.key] ??
                                        (field.allowEmptyOption ? "" : options[0]?.value ?? ""),
                                );
                                return (
                                    <label key={field.key} className="text-sm font-semibold">
                                        {field.label}
                                        {field.required && <span className="text-red-500"> *</span>}
                                        {field.type === "select" || field.optionsEndpoint ? (
                                            <select
                                                required={field.required}
                                                name={field.key}
                                                defaultValue={currentValue}
                                                className="field mt-2"
                                            >
                                                <option value="" disabled={!field.allowEmptyOption}>
                                                    {field.allowEmptyOption
                                                        ? "Không có gói"
                                                        : `Chọn ${field.label.toLowerCase()}`}
                                                </option>
                                                {options.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                required={field.required}
                                                name={field.key}
                                                type={field.type ?? "text"}
                                                defaultValue={inputValue(
                                                    field,
                                                    editing?.[field.key] ?? "",
                                                )}
                                                className="field mt-2"
                                            />
                                        )}
                                    </label>
                                );
                                })}
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
                                {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo mới"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
