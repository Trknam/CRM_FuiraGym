"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Dumbbell, Loader2, Sparkles, Target, UserRound } from "lucide-react";

type Member = { id: string; name: string };
type Props = { onGenerated: (result: any) => void; onError: (message: string) => void };

const limitationOptions = [
    ["Đau lưng", "lưng"],
    ["Đau gối", "gối"],
    ["Đau bàn chân / cổ chân", "bàn chân / cổ chân"],
    ["Đau vai", "vai"],
    ["Đau cổ tay", "cổ tay"],
    ["Đau khuỷu tay", "khuỷu tay"],
    ["Đau hông", "hông"],
    ["Đau cổ", "cổ"],
] as const;

export function WorkoutInputForm({ onGenerated, onError }: Props) {
    const [members, setMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [loading, setLoading] = useState(false);
    const [selectedLimitations, setSelectedLimitations] = useState<string[]>([]);
    const [customLimitation, setCustomLimitation] = useState("");
    const [form, setForm] = useState({
        memberId: "",
        goal: "Tăng cơ",
        level: "Beginner",
        sessionsPerWeek: "3",
        durationMinutes: "60",
        equipment: "Gym đầy đủ thiết bị",
        preferences: "",
    });

    useEffect(() => {
        fetch("/api/members", { cache: "no-store" })
            .then(async (response) => {
                const result = await response.json();
                if (!response.ok)
                    throw new Error(result.message || "Không thể lấy danh sách hội viên.");
                setMembers(result.data ?? []);
                setForm((current) => ({
                    ...current,
                    memberId: current.memberId || result.data?.[0]?.id || "",
                }));
            })
            .catch((error) => onError(error.message))
            .finally(() => setLoadingMembers(false));
    }, [onError]);

    const limitations = useMemo(
        () => [
            ...selectedLimitations,
            ...(customLimitation.trim() ? [customLimitation.trim()] : []),
        ],
        [selectedLimitations, customLimitation],
    );

    const update = (key: string, value: string) =>
        setForm((current) => ({ ...current, [key]: value }));
    const toggleLimitation = (value: string) => {
        setSelectedLimitations((current) =>
            current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value],
        );
    };
    const inputClass =
        "w-full rounded-xl border border-[#e8ebf2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#635bff]";

    async function generate() {
        setLoading(true);
        onError("");
        try {
            const response = await fetch("/api/workouts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    limitations,
                    sessionsPerWeek: Number(form.sessionsPerWeek),
                    durationMinutes: Number(form.durationMinutes),
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể tạo workout.");
            onGenerated(result.data);
        } catch (error) {
            onError(error instanceof Error ? error.message : "Không thể tạo workout.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="card p-5">
            <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eeecff] text-[#635bff]">
                    <Sparkles />
                </div>
                <div>
                    <h2 className="font-bold">Thông tin đầu vào</h2>
                    <p className="text-xs text-[#98a2b3]">
                        Vector Search → Rule Engine → AI giúp giảm dữ liệu AI phải xử lý.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]">
                        <UserRound size={14} />
                        Hội viên
                    </label>
                    <select
                        disabled={loadingMembers}
                        className={inputClass}
                        value={form.memberId}
                        onChange={(e) => update("memberId", e.target.value)}
                    >
                        <option value="">{loadingMembers ? "Đang tải..." : "Chọn hội viên"}</option>
                        {members.map((member) => (
                            <option key={member.id} value={member.id}>
                                {member.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]">
                        <Target size={14} />
                        Mục tiêu
                    </label>
                    <select
                        className={inputClass}
                        value={form.goal}
                        onChange={(e) => update("goal", e.target.value)}
                    >
                        <option>Tăng cơ</option>
                        <option>Giảm cân / giảm mỡ</option>
                        <option>Tăng sức mạnh</option>
                        <option>Cải thiện thể lực</option>
                        <option>Phục hồi thể lực nhẹ</option>
                    </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]">
                            <Dumbbell size={14} />
                            Trình độ
                        </label>
                        <select
                            className={inputClass}
                            value={form.level}
                            onChange={(e) => update("level", e.target.value)}
                        >
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]">
                            <CalendarDays size={14} />
                            Số buổi / tuần
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="7"
                            className={inputClass}
                            value={form.sessionsPerWeek}
                            onChange={(e) => update("sessionsPerWeek", e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]">
                            <Clock3 size={14} />
                            Thời lượng / buổi
                        </label>
                        <input
                            type="number"
                            min="20"
                            max="180"
                            className={inputClass}
                            value={form.durationMinutes}
                            onChange={(e) => update("durationMinutes", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]">
                            <Dumbbell size={14} />
                            Thiết bị
                        </label>
                        <input
                            className={inputClass}
                            value={form.equipment}
                            onChange={(e) => update("equipment", e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-semibold text-[#667085]">
                        Sở thích
                    </label>
                    <textarea
                        className="min-h-20 w-full resize-none rounded-xl border border-[#e8ebf2] p-3 text-sm outline-none focus:border-[#635bff]"
                        value={form.preferences}
                        onChange={(e) => update("preferences", e.target.value)}
                        placeholder="Ví dụ: ưu tiên máy, thích cardio nhẹ..."
                    />
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="block text-xs font-semibold text-[#667085]">
                            Hạn chế / vùng đau cần lưu ý
                        </label>
                        <span className="text-[11px] text-[#98a2b3]">Có thể chọn nhiều</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {limitationOptions.map(([label, value]) => {
                            const active = selectedLimitations.includes(value);
                            return (
                                <button
                                    type="button"
                                    key={value}
                                    onClick={() => toggleLimitation(value)}
                                    className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${active ? "border-[#635bff] bg-[#f1f0ff] text-[#5148d8]" : "border-[#e8ebf2] bg-white text-[#667085] hover:border-[#cfd4dc]"}`}
                                >
                                    {active ? "✓ " : ""}
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    <input
                        className={`${inputClass} mt-2`}
                        value={customLimitation}
                        onChange={(e) => setCustomLimitation(e.target.value)}
                        placeholder="Nhập thêm: đau cổ chân trái, đau khi squat sâu..."
                    />
                    {limitations.length ? (
                        <p className="mt-2 text-[11px] leading-5 text-[#667085]">
                            Đang áp dụng: {limitations.join(" · ")}
                        </p>
                    ) : null}
                    <p className="mt-2 text-[11px] leading-5 text-amber-700">
                        Hệ thống dùng các hạn chế để loại bài có nguy cơ liên quan; không thay thế
                        đánh giá y khoa.
                    </p>
                </div>

                <button
                    disabled={loading || !form.memberId}
                    onClick={generate}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#635bff] py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <Loader2 size={17} className="animate-spin" />
                            AI đang tìm bài phù hợp và tạo lịch...
                        </>
                    ) : (
                        <>
                            <Sparkles size={17} />
                            Tạo &amp; lưu lịch tập bằng AI
                        </>
                    )}
                </button>
            </div>
        </section>
    );
}
