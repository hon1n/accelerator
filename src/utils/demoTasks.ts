import type { TaskListItem } from "../types/tasks";

export const DEMO_TASKS_ENABLED = import.meta.env.VITE_USE_DEMO_TASKS !== "false";

export interface TranscriptEntry {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface ProcessingStage {
  id: string;
  name: string;
  status: "completed" | "in_progress" | "pending" | "error";
  progress: number;
  estimated_time: string;
}

export interface TaskDetail extends TaskListItem {
  description?: string;
  elapsed_time?: number;
  estimated_time?: number;
  summary?: string;
  transcript?: TranscriptEntry[];
  stages?: ProcessingStage[];
}

const DEMO_SUMMARY = `# I. Хронологический обзор обсуждения

## 1. Вступительное слово и ретроспектива прошлого квартала
Собрание открыл Дмитрий. Команда обсудила ключевые достижения и области для улучшения.

## 2. Презентация стратегии на новый квартал
Озвучены приоритеты: расширение клиентской базы, рост среднего чека и эффективность воронки.

## 3. Согласование OKR
Участники согласовали цели и ключевые результаты отдела продаж.

# II. Принятые решения

- Утвердить итоги прошлого квартала (план продаж 112%).
- Увеличить выручку на 20% в следующем квартале.
- Внедрить еженедельные встречи по контролю KPI.`;

const DEMO_TRANSCRIPT: TranscriptEntry[] = [
  {
    speaker: "СПИКЕР №1",
    timestamp: "00:00:00",
    text: "Коллеги, добрый день. Начинаем квартальное совещание по целям и OKR.",
  },
  {
    speaker: "СПИКЕР №2",
    timestamp: "00:00:15",
    text: "В прошлом квартале выполнили план на 112% и привлекли 45 новых клиентов.",
  },
  {
    speaker: "СПИКЕР №1",
    timestamp: "00:00:37",
    text: "На этот квартал цель — рост выручки на 20%, то есть 15 миллионов рублей.",
  },
];

const DEFAULT_STAGES: ProcessingStage[] = [
  {
    id: "noise_removal",
    name: "Удаление шумов",
    status: "completed",
    progress: 100,
    estimated_time: "Завершено",
  },
  {
    id: "speech_recognition",
    name: "Распознавание речи",
    status: "in_progress",
    progress: 45,
    estimated_time: "В процессе",
  },
  {
    id: "transcript_splitting",
    name: "Разделение стенограмм",
    status: "pending",
    progress: 0,
    estimated_time: "Запланировано",
  },
  {
    id: "summary_generation",
    name: "Создание конспекта",
    status: "pending",
    progress: 0,
    estimated_time: "Запланировано",
  },
];

export function generateDemoTasks(): TaskListItem[] {
  const statuses = ["processing_transcribe", "done", "error", "done", "done"];
  const tasks: TaskListItem[] = [];

  for (let i = 1; i <= 42; i++) {
    tasks.push({
      task_id: `task-uuid-${i}`,
      task_name: `Встреча №${i}: ${i % 3 === 0 ? "Утверждение бюджета" : "Синхронизация команды"}`,
      original_filename: `record_${i}.mp3`,
      meeting_date: `${(i % 28) + 1} апр, 2026`,
      duration_seconds: (15 + ((i * 7) % 60)) * 60,
      status: statuses[i % statuses.length],
    });
  }

  return tasks;
}

export function getDemoTaskDetail(taskId: string): TaskDetail | null {
  const demo = generateDemoTasks().find((t) => t.task_id === taskId);
  if (!demo) return null;

  const isDone = demo.status === "done";
  const isProcessing =
    demo.status === "processing_transcribe" || demo.status === "processing_summary";

  return {
    ...demo,
    task_name:
      demo.task_name ??
      "Квартальное планирование: Цели и OKR отдела продаж",
    elapsed_time: isProcessing ? 652 : 0,
    estimated_time: isProcessing ? 2220 : 0,
    summary: isDone ? DEMO_SUMMARY : undefined,
    transcript: isDone ? DEMO_TRANSCRIPT : undefined,
    stages: isProcessing ? DEFAULT_STAGES.map((s) => ({ ...s })) : undefined,
  };
}

export function isDemoTaskId(taskId: string): boolean {
  return taskId.startsWith("task-uuid-");
}
