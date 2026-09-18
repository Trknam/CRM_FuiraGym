import { ChevronRight, Clock3, Dumbbell, ShieldCheck } from "lucide-react";
import type { WorkoutPlan } from "./workout-types";

export function WorkoutPreview({
    result,
}: {
    result: {
        plan: WorkoutPlan;
        summary: string;
        rationale: string;
        safetyNote: string;
        exerciseCount: number;
    };
}) {
    const { plan } = result;
    return (
        <div>
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h2 className="font-bold">Kế hoạch {plan.sessionsPerWeek} buổi / tuần</h2>
                    <p className="mt-1 text-xs text-[#98a2b3]">
                        {plan.member.fullName} · {plan.goal} · {plan.level} · {plan.durationMinutes}{" "}
                        phút/buổi
                    </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    AI Generated
                </span>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#f7f7ff] p-3 text-xs">
                    <span className="text-[#98a2b3]">Bài tập được dùng</span>
                    <strong className="mt-1 block text-lg">{result.exerciseCount}</strong>
                </div>
                <div className="rounded-xl bg-[#f7f7ff] p-3 text-xs">
                    <span className="text-[#98a2b3]">Model</span>
                    <strong className="mt-1 block text-sm">{plan.aiModel}</strong>
                </div>
                <div className="rounded-xl bg-[#f7f7ff] p-3 text-xs">
                    <span className="text-[#98a2b3]">Thiết bị</span>
                    <strong className="mt-1 block text-sm">{plan.equipment}</strong>
                </div>
            </div>
            <div className="mb-5 rounded-xl border border-[#e8ebf2] p-4">
                <p className="text-sm font-semibold">{result.summary}</p>
                <p className="mt-2 text-sm leading-6 text-[#667085]">{result.rationale}</p>
            </div>
            <div className="grid gap-3">
                {plan.days.map((day) => (
                    <div key={day.id} className="rounded-xl border border-[#e8ebf2] p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-[#635bff]">
                                    {day.dayName}
                                </span>
                                <h3 className="font-semibold">{day.title}</h3>
                                <p className="mt-1 text-xs text-[#98a2b3]">{day.focus}</p>
                            </div>
                            <ChevronRight size={17} className="text-[#98a2b3]" />
                        </div>
                        <div className="grid gap-2">
                            {day.exercises.map((item) => (
                                <div key={item.id} className="rounded-lg bg-[#fafbfc] p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold">
                                                {item.exercise.name}
                                            </p>
                                            <p className="mt-1 text-xs text-[#98a2b3]">
                                                {item.exercise.muscle} ·{" "}
                                                {item.exercise.equipment || "Không dụng cụ"}
                                            </p>
                                        </div>
                                        <Dumbbell size={16} className="text-[#635bff]" />
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#475467]">
                                        <span>{item.sets} sets</span>
                                        <span>·</span>
                                        <span>
                                            {item.reps
                                                ? `${item.reps} reps`
                                                : `${item.durationMinutes} phút`}
                                        </span>
                                        {item.restSeconds ? (
                                            <>
                                                <span>·</span>
                                                <span>nghỉ {item.restSeconds}s</span>
                                            </>
                                        ) : null}
                                    </div>
                                    {item.note ? (
                                        <p className="mt-2 text-xs text-[#667085]">{item.note}</p>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-5 rounded-xl bg-[#f7f7ff] p-4 text-sm leading-6 text-[#667085]">
                <div className="flex items-start gap-2">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#635bff]" />
                    <div>
                        <strong className="text-[#172033]">An toàn:</strong>{" "}
                        {result.safetyNote ||
                            "Kế hoạch chỉ sử dụng bài tập có trong Exercise Database. Nếu có đau hoặc chấn thương, cần được đánh giá bởi chuyên gia phù hợp."}
                    </div>
                </div>
            </div>
        </div>
    );
}
