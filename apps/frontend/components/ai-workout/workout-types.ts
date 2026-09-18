export type WorkoutExercise = {
    id: string;
    sortOrder: number;
    sets: number | null;
    reps: number | null;
    durationMinutes: number | null;
    restSeconds: number | null;
    note: string | null;
    exercise: {
        id: string;
        name: string;
        muscle: string;
        equipment: string | null;
        level: string;
        description: string | null;
    };
};

export type WorkoutDay = {
    id: string;
    dayNumber: number;
    dayName: string;
    title: string;
    focus: string;
    exercises: WorkoutExercise[];
};

export type WorkoutPlan = {
    id: string;
    goal: string;
    level: string;
    sessionsPerWeek: number;
    durationMinutes: number;
    equipment: string;
    preferences: string | null;
    notes: string | null;
    aiModel: string;
    createdAt: string;
    member: { id: string; fullName: string };
    days: WorkoutDay[];
};
