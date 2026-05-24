import type { TaskListItem } from "../types/tasks";

const STORAGE_KEY = "accelerator_tasks";

export interface StoredTask extends TaskListItem {
  group_id: string;
  description?: string;
  created_at?: string;
  estimated_wait_seconds?: number;
}

export function readStoredTasks(): StoredTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredTask[]) : [];
  } catch {
    return [];
  }
}

export function writeStoredTasks(tasks: StoredTask[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function upsertStoredTask(task: StoredTask): void {
  const tasks = readStoredTasks();
  const index = tasks.findIndex((t) => t.task_id === task.task_id);
  if (index >= 0) {
    tasks[index] = { ...tasks[index], ...task };
  } else {
    tasks.unshift(task);
  }
  writeStoredTasks(tasks);
}

export function findStoredTask(taskId: string): StoredTask | undefined {
  return readStoredTasks().find((t) => t.task_id === taskId);
}

export function formatMeetingDateLabel(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
