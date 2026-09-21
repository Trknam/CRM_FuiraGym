"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Plus, Search, ShieldCheck, Sparkles } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { WorkoutInputForm } from "@/components/ai-workout/workout-input-form";
import { WorkoutPreview } from "@/components/ai-workout/workout-preview";

export function AIWorkoutPage() {
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(true);
    const onError = useCallback((message: string) => setError(message), []);

    useEffect(() => {
        fetch("/api/workouts", { cache: "no-store" })
            .then(async (response) => {
                const data = await response.json();
                if (response.ok && data.data?.[0]) {
                    setResult({
                        plan: data.data[0],
                        summary: "Kế hoạch đã lưu",
                        rationale: "Đây là kế hoạch gần nhất được lưu trong PostgreSQL.",
                        safetyNote: data.data[0].notes || "",
                        exerciseCount:
                            data.data[0].days?.reduce(
                                (sum: number, day: any) => sum + day.exercises.length,
                                0,
                            ) || 0,
                    });
                }
            })
            .catch(() => undefined)
            .finally(() => setLoadingHistory(false));
    }, []);

    const reset = () => {
        setResult(null);
        setError("");
    };
    const retrieval = result?.retrieval;

    return (
        <>
            <PageTitle
                title="AI Workout Planner"
                description="Vector Search + Rule Engine + AI cá nhân hóa kế hoạch tập"
            />
            <div className="px-5 pb-8 md:px-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8ebf2] bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#667085]">
                        <span>
                            <span className="font-semibold text-[#172033]">Luồng AI:</span> Vector
                            Search → Rule Engine → Gemini API → Validation → PostgreSQL.
                        </span>
                        {retrieval ? (
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${retrieval.vectorSearch ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                            >
                                <Search size={13} />
                                {retrieval.vectorSearch
                                    ? "Vector Search đang hoạt động"
                                    : "Đang dùng Rule Engine fallback"}
                            </span>
                        ) : null}
                    </div>
                    {result ? (
                        <button
                            onClick={reset}
                            className="flex items-center gap-2 rounded-lg border border-[#e8ebf2] px-3 py-2 text-xs font-semibold text-[#344054]"
                        >
                            <Plus size={15} />
                            Tạo lịch mới
                        </button>
                    ) : null}
                </div>

                <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                    <WorkoutInputForm
                        onGenerated={(value) => {
                            setError("");
                            setResult(value);
                        }}
                        onError={onError}
                    />
                    <section className="card p-5">
                        {error ? (
                            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        ) : null}
                        {loadingHistory ? (
                            <div className="grid min-h-[560px] place-items-center text-sm text-[#98a2b3]">
                                Đang tải lịch tập đã lưu...
                            </div>
                        ) : !result ? (
                            <div className="grid min-h-[560px] place-items-center text-center">
                                <div>
                                    <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[#f1f0ff] text-[#635bff]">
                                        <Sparkles size={28} />
                                    </div>
                                    <h2 className="text-lg font-bold">
                                        Workout Plan sẽ xuất hiện ở đây
                                    </h2>
                                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
                                        Hội viên → Semantic Search → Safety Rules → AI → Validation
                                        → PostgreSQL.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-emerald-700">
                                    <span className="inline-flex items-center gap-1">
                                        <History size={15} />
                                        Kế hoạch đã lưu trong PostgreSQL
                                    </span>
                                    {retrieval ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f0ff] px-2.5 py-1 text-[#5148d8]">
                                            <ShieldCheck size={13} />
                                            {retrieval.candidateCount} bài sau Rule Engine ·{" "}
                                            {retrieval.catalogCount} bài gửi AI
                                        </span>
                                    ) : null}
                                </div>
                                <WorkoutPreview result={result} />
                            </>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}
