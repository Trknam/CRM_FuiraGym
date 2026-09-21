import { Router } from "express";
import { prisma } from "../db/prisma";
import { requirePermission, getAccessibleBranchIds } from "../auth/authorization";
import {
  buildRuleSummary,
  filterWorkoutExercises,
  parseLimitations,
} from "../services/workout-rules";
import { recordActivity } from "../services/activity";

export const workoutsRoutes = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const MODEL = process.env.WORKOUT_AI_MODEL ?? "gemini-2.5-flash";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const text = (value: unknown, fallback = "") => String(value ?? fallback).trim();
const num = (value: unknown, fallback = 0) => (Number.isFinite(Number(value)) ? Math.round(Number(value)) : fallback);
const positiveInt = (value: unknown) => Number.isInteger(Number(value)) && Number(value) > 0;

const WORKOUT_SCHEMA = {
  type: "object",
  required: ["summary", "rationale", "safetyNote", "days"],
  properties: {
    summary: { type: "string" },
    rationale: { type: "string" },
    safetyNote: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "focus", "exercises"],
        properties: {
          title: { type: "string" },
          focus: { type: "string" },
          exercises: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: {
              type: "object",
              required: ["exerciseId", "sets", "reps", "durationMinutes", "restSeconds", "note"],
              properties: {
                exerciseId: { type: "string" },
                sets: { type: "integer", minimum: 1, maximum: 6 },
                reps: { type: "integer", minimum: 0, maximum: 100 },
                durationMinutes: { type: "integer", minimum: 0, maximum: 60 },
                restSeconds: { type: "integer", minimum: 0, maximum: 300 },
                note: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

const scope = async (req: any) => {
  const ids = await getAccessibleBranchIds(req);
  return ids === null ? {} : { branchId: { in: ids } };
};

function normalizePlan(raw: unknown) {
  if (!raw || typeof raw !== "object") throw new Error("AI_INVALID_JSON");
  return raw as {
    summary?: unknown;
    rationale?: unknown;
    safetyNote?: unknown;
    days?: unknown;
  };
}

function validatePlan(data: ReturnType<typeof normalizePlan>, sessions: number, catalogIds: Set<string>) {
  if (!Array.isArray(data.days) || data.days.length !== sessions) {
    return "Số ngày trong kế hoạch không đúng yêu cầu.";
  }

  for (const [dayIndex, day] of data.days.entries()) {
    if (!day || typeof day !== "object" || !Array.isArray((day as any).exercises)) {
      return `Ngày ${dayIndex + 1} không có danh sách bài tập hợp lệ.`;
    }

    const exercises = (day as any).exercises as any[];
    if (exercises.length < 2 || exercises.length > 6) {
      return `Ngày ${dayIndex + 1} phải có từ 2 đến 6 bài tập.`;
    }

    const seen = new Set<string>();
    for (const exercise of exercises) {
      if (!catalogIds.has(exercise?.exerciseId)) {
        return "AI chọn exerciseId không nằm trong danh sách backend đã cung cấp.";
      }
      if (seen.has(exercise.exerciseId)) {
        return "Một ngày không được lặp cùng một bài tập.";
      }
      seen.add(exercise.exerciseId);

      if (!positiveInt(exercise.sets) || Number(exercise.sets) > 6) return "Số set không hợp lệ.";
      const reps = Number(exercise.reps ?? 0);
      const duration = Number(exercise.durationMinutes ?? 0);
      const rest = Number(exercise.restSeconds ?? 60);
      if (!Number.isInteger(reps) || reps < 0 || reps > 100) return "Số reps không hợp lệ.";
      if (!Number.isInteger(duration) || duration < 0 || duration > 60) return "Thời lượng bài không hợp lệ.";
      if ((reps > 0 && duration > 0) || (reps === 0 && duration === 0)) return "Mỗi bài phải dùng reps hoặc durationMinutes, không dùng cả hai.";
      if (!Number.isInteger(rest) || rest < 0 || rest > 300) return "Thời gian nghỉ không hợp lệ.";
    }
  }

  return null;
}

function buildPrompt(input: {
  sessions: number;
  goal: string;
  level: string;
  duration: number;
  equipment: string;
  preferences: string;
  limitations: string;
  catalog: Array<Record<string, unknown>>;
  rules: unknown;
  repairReason?: string;
}) {
  const repair = input.repairReason
    ? `LẦN TRƯỚC KHÔNG HỢP LỆ. Lỗi: ${input.repairReason}. Hãy sửa đúng lỗi và chỉ trả JSON theo schema.`
    : "";

  return [
    "Bạn là AI Workout Planner cho hệ thống quản lý phòng gym.",
    "Không chẩn đoán bệnh và không tự suy đoán chấn thương. Rule Engine của backend đã loại các bài cần tránh.",
    "CHỈ được chọn exerciseId có trong catalog. Không tự tạo, sửa, viết tắt hoặc đoán exerciseId.",
    `Tạo đúng ${input.sessions} ngày. Mỗi ngày từ 2 đến 6 bài và không lặp cùng một exerciseId trong cùng ngày.`,
    "Mỗi bài phải có sets từ 1 đến 6. Bài theo reps: reps > 0 và durationMinutes = 0. Bài theo thời gian: durationMinutes > 0 và reps = 0.",
    "restSeconds phải từ 0 đến 300.",
    repair,
    `Mục tiêu=${input.goal}`,
    `Trình độ=${input.level}`,
    `Thời lượng mỗi buổi=${input.duration} phút`,
    `Thiết bị=${input.equipment}`,
    `Sở thích=${input.preferences || "Không có"}`,
    `Hạn chế của hội viên=${input.limitations || "Không có"}`,
    `Rule Engine=${JSON.stringify(input.rules)}`,
    `Catalog đã được semantic search xếp hạng=${JSON.stringify(input.catalog)}`,
    "Ưu tiên các bài có relevanceScore cao nhưng luôn tuân thủ mục tiêu, trình độ, thiết bị và safetyNote.",
    "Chỉ trả JSON theo schema đã cung cấp, không markdown.",
  ].filter(Boolean).join("\n");
}

async function generatePlan(prompt: string) {
  if (!GEMINI_API_KEY) throw new Error("AI_CONFIG_MISSING");

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/${MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "Trả về đúng JSON schema, không markdown và không thêm văn bản bên ngoài JSON." }],
          },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: WORKOUT_SCHEMA,
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("Gemini API error:", response.status, detail.slice(0, 1000));
      throw new Error("AI_UNAVAILABLE");
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!content) throw new Error("AI_INVALID_JSON");

    return normalizePlan(JSON.parse(content));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("AI_INVALID_JSON");
    if (error instanceof Error && error.message === "AI_CONFIG_MISSING") throw error;
    throw new Error("AI_UNAVAILABLE");
  }
}

workoutsRoutes.get("/", async (req, res) => {
  try {
    await requirePermission(req, "workout.read");
    const plans = await prisma.workoutPlan.findMany({
      where: { ...(await scope(req)), ...(req.query.memberId ? { memberId: String(req.query.memberId) } : {}) },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        member: { select: { id: true, fullName: true } },
        days: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { sortOrder: "asc" }, include: { exercise: true } } } },
      },
    });
    return res.json({ data: plans });
  } catch (error) {
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message: (error as any).message });
    return res.status(500).json({ message: "Không thể lấy lịch sử workout." });
  }
});

workoutsRoutes.post("/", async (req, res) => {
  try {
    const user = await requirePermission(req, "workout.generate");
    const body = req.body ?? {};
    const memberId = text(body.memberId);
    const goal = text(body.goal);
    const sessions = num(body.sessionsPerWeek, 3);
    const duration = num(body.durationMinutes, 60);
    const level = text(body.level, "Beginner");
    const equipment = text(body.equipment, "Gym đầy đủ thiết bị");
    const preferences = text(body.preferences);
    const limitations = parseLimitations(body.limitations).join("; ");

    if (!memberId || !goal) return res.status(400).json({ message: "Hội viên và mục tiêu là bắt buộc." });
    if (sessions < 1 || sessions > 7) return res.status(400).json({ message: "Số buổi/tuần phải từ 1 đến 7." });
    if (duration < 20 || duration > 180) return res.status(400).json({ message: "Thời lượng mỗi buổi phải từ 20 đến 180 phút." });

    const member = await prisma.member.findFirst({
      where: { id: memberId, ...(await scope(req)) },
      select: { id: true, branchId: true, fullName: true, status: true, dateOfBirth: true },
    });
    if (!member) return res.status(404).json({ message: "Không tìm thấy hội viên trong phạm vi chi nhánh." });

    const exercises = await prisma.exercise.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    const usable = filterWorkoutExercises(exercises, { goal, level, equipment, limitations, preferences });
    const rules = buildRuleSummary({ goal, level, equipment, limitations, preferences }, usable.length);

    if (usable.length < 4) {
      return res.status(422).json({
        message: `Rule Engine chỉ tìm được ${usable.length} bài tập phù hợp. Hãy giảm bớt hạn chế hoặc bổ sung thiết bị nếu phù hợp.`,
        data: { activeLimitations: rules.activeLimitations },
      });
    }

    // Production tạm thời dùng Rule Engine hoàn toàn, không phụ thuộc Ollama/embedding server.
    // filterWorkoutExercises đã sắp xếp bài theo mục tiêu, trình độ, thiết bị và hạn chế.
    const ranked = usable.map((exercise, index) => ({
      id: exercise.id,
      similarity: Math.max(0, 1 - index / Math.max(1, usable.length)),
      fallbackRank: index,
    }));

    const selectedIds = new Set(ranked.slice(0, Math.min(32, ranked.length)).map((item) => item.id));
    const catalog = usable
      .filter((exercise) => selectedIds.has(exercise.id))
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        muscle: exercise.muscle,
        equipment: exercise.equipment,
        level: exercise.level,
        description: exercise.description,
        relevanceScore: Number(ranked.find((item) => item.id === exercise.id)?.similarity ?? 0).toFixed(4),
      }));

    const baseInput = { sessions, goal, level, duration, equipment, preferences, limitations, catalog, rules };
    let data: ReturnType<typeof normalizePlan> | null = null;
    let validationError = "";

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const prompt = buildPrompt({ ...baseInput, repairReason: validationError || undefined });
      try {
        data = await generatePlan(prompt);
      } catch (error) {
        if (error instanceof Error && error.message === "AI_CONFIG_MISSING") {
          return res.status(503).json({ message: "Gemini API chưa được cấu hình. Hãy thêm GEMINI_API_KEY cho backend." });
        }
        if (error instanceof Error && error.message === "AI_UNAVAILABLE") {
          return res.status(503).json({ message: `Gemini API chưa sẵn sàng. Kiểm tra GEMINI_API_KEY và model ${MODEL}.` });
        }
        validationError = "AI không trả về JSON hợp lệ.";
        continue;
      }

      validationError = validatePlan(data, sessions, new Set(catalog.map((item) => item.id))) ?? "";
      if (!validationError) break;
    }

    if (!data || validationError) {
      return res.status(502).json({
        message: `AI chưa tạo được kế hoạch hợp lệ sau 2 lần kiểm tra. ${validationError}`,
        data: { vectorSearch: false, ranking: "rule-engine", activeLimitations: rules.activeLimitations },
      });
    }

    const names = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.workoutPlan.create({
        data: {
          branchId: member.branchId,
          memberId: member.id,
          createdById: user.id,
          goal,
          level,
          sessionsPerWeek: sessions,
          durationMinutes: duration,
          equipment,
          preferences: preferences || null,
          notes: text(data?.safetyNote) || null,
          aiModel: MODEL,
        },
      });

      for (let index = 0; index < (data.days as any[]).length; index += 1) {
        const dayData = (data.days as any[])[index];
        const day = await tx.workoutDay.create({
          data: {
            workoutPlanId: created.id,
            dayNumber: index + 1,
            dayName: names[index],
            title: text(dayData.title),
            focus: text(dayData.focus),
          },
        });

        await tx.workoutExercise.createMany({
          data: dayData.exercises.map((exercise: any, sortOrder: number) => ({
            workoutDayId: day.id,
            exerciseId: exercise.exerciseId,
            sortOrder: sortOrder + 1,
            sets: num(exercise.sets),
            reps: num(exercise.reps),
            durationMinutes: num(exercise.durationMinutes),
            restSeconds: num(exercise.restSeconds, 60),
            note: text(exercise.note) || null,
          })),
        });
      }

      return tx.workoutPlan.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          member: { select: { id: true, fullName: true } },
          days: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { sortOrder: "asc" }, include: { exercise: true } } } },
        },
      });
    });

    await recordActivity({
      req,
      action: "đã tạo kế hoạch tập luyện AI cho hội viên",
      entity: "workout",
      entityId: plan.id,
      targetName: member.fullName,
      branchId: member.branchId,
      details: "Mục tiêu: " + goal + "; " + sessions + " buổi/tuần; " + duration + " phút/buổi.",
    });

    return res.status(201).json({
      data: {
        plan,
        summary: text(data.summary),
        rationale: text(data.rationale),
        safetyNote: text(data.safetyNote),
        exerciseCount: plan.days.reduce((total, day) => total + day.exercises.length, 0),
        retrieval: {
          vectorSearch: false,
          ranking: "rule-engine",
          candidateCount: usable.length,
          catalogCount: catalog.length,
          activeLimitations: rules.activeLimitations,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = (error as any)?.status;
    if (status) return res.status(status).json({ message });
    console.error("Workout generation error:", error);
    return res.status(500).json({ message: "Không thể tạo workout bằng Gemini API." });
  }
});
