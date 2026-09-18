export type WorkoutRuleInput = {
    goal: string;
    level: string;
    equipment: string;
    limitations: string;
    preferences: string;
};

type ExerciseLike = {
    id: string;
    name: string;
    muscle: string;
    equipment: string | null;
    level: string;
    description: string | null;
    isActive: boolean;
};

const LIMITATION_RULES = [
    {
        keys: ["eo", "lưng", "thắt lưng", "lumbar", "lower back"],
        blocked: ["deadlift", "romanian deadlift", "good morning", "back squat", "barbell squat"],
    },
    { keys: ["gối", "knee"], blocked: ["squat", "leg press", "lunge", "jump", "running", "chạy"] },
    {
        keys: ["vai", "shoulder"],
        blocked: ["overhead press", "shoulder press", "upright row", "lateral raise"],
    },
    { keys: ["cổ tay", "wrist"], blocked: ["bench press", "push up", "barbell curl"] },
    { keys: ["hông", "hip"], blocked: ["deep squat", "lunge", "hip thrust"] },
];

function normalized(value: string | null | undefined) {
    return (value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function matchesLevel(level: string, requested: string) {
    const e = normalized(level);
    const r = normalized(requested);
    if (r.includes("advanced")) return e.includes("advanced") || e.includes("intermediate");
    if (r.includes("intermediate")) return e.includes("beginner") || e.includes("intermediate");
    return e.includes("beginner") || e.includes("intermediate") || e.includes("all");
}

function matchesEquipment(equipment: string | null, requested: string) {
    const r = normalized(requested);
    const e = normalized(equipment);
    if (!r || r.includes("gym day du") || r.includes("full gym")) return true;
    if (r.includes("khong dung cu") || r.includes("bodyweight"))
        return !e || e.includes("bodyweight") || e.includes("none") || e.includes("khong");
    return (
        r
            .split(/[,;]+/)
            .map((x) => x.trim())
            .filter(Boolean)
            .some((keyword) => e.includes(keyword)) || !e
    );
}

function blockedByLimitation(exercise: ExerciseLike, limitations: string) {
    const text = normalized(limitations);
    if (!text) return false;
    const haystack = normalized(
        `${exercise.name} ${exercise.muscle} ${exercise.description ?? ""}`,
    );
    return LIMITATION_RULES.some(
        (rule) =>
            rule.keys.some((key) => text.includes(normalized(key))) &&
            rule.blocked.some((key) => haystack.includes(normalized(key))),
    );
}

function goalScore(exercise: ExerciseLike, goal: string) {
    const haystack = normalized(
        `${exercise.name} ${exercise.muscle} ${exercise.description ?? ""}`,
    );
    const target = normalized(goal);
    if (target.includes("suc manh"))
        return /(strength|compound|squat|press|deadlift|row|pull|bench)/.test(haystack) ? 4 : 1;
    if (target.includes("tang co"))
        return /(chest|back|leg|shoulder|arm|glute|lat|quad|hamstring|muscle)/.test(haystack)
            ? 4
            : 1;
    if (target.includes("giam can") || target.includes("giam mo") || target.includes("the luc"))
        return /(cardio|cycling|bike|walk|run|row|hiit)/.test(haystack) ? 4 : 2;
    return 2;
}

export function filterWorkoutExercises<T extends ExerciseLike>(
    exercises: T[],
    input: WorkoutRuleInput,
) {
    const eligible = exercises.filter(
        (exercise) =>
            exercise.isActive &&
            matchesLevel(exercise.level, input.level) &&
            matchesEquipment(exercise.equipment, input.equipment) &&
            !blockedByLimitation(exercise, input.limitations),
    );
    return eligible.sort((a, b) => goalScore(b, input.goal) - goalScore(a, input.goal));
}

export function buildRuleSummary(input: WorkoutRuleInput, total: number) {
    const warnings: string[] = [];
    if (input.limitations.trim())
        warnings.push("Các bài có nguy cơ liên quan đến hạn chế đã được loại khỏi danh sách AI.");
    return { candidateCount: total, warnings };
}
