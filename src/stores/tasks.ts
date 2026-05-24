import { defineStore } from "pinia";
import { ref } from "vue";
import { extractApiErrorMessage, tasksService, type UploadTaskData } from "../api";
import type { Pagination, TaskListItem } from "../types/tasks";
import { DEMO_TASKS_ENABLED, generateDemoTasks, getDemoTaskDetail, type TaskDetail } from "../utils/demoTasks";
import {
  formatMeetingDateLabel,
  readStoredTasks,
  upsertStoredTask,
  type StoredTask,
} from "../utils/taskStorage";

function buildProcessingDetail(task: StoredTask): TaskDetail {
  const wait = task.estimated_wait_seconds ?? Math.max(300, Math.round((task.duration_seconds ?? 0) * 0.5));

  return {
    ...task,
    elapsed_time: 0,
    estimated_time: wait,
    stages: [
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
        progress: 10,
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
    ],
  };
}

export const useTasksStore = defineStore("tasks", () => {
  const tasks = ref<TaskListItem[]>([]);
  const pagination = ref<Pagination | null>(null);
  const isLoading = ref(false);
  const isUploading = ref(false);
  const error = ref<string | null>(null);

  function listTasksForGroup(groupId?: string): TaskListItem[] {
    const stored = groupId
      ? readStoredTasks().filter((t) => t.group_id === groupId)
      : readStoredTasks();

    const demo = DEMO_TASKS_ENABLED ? generateDemoTasks() : [];
    const merged = new Map<string, TaskListItem>();

    for (const item of demo) {
      merged.set(item.task_id, item);
    }
    for (const item of stored) {
      merged.set(item.task_id, item);
    }

    return Array.from(merged.values());
  }

  const fetchTasks = async (page = 1, limit = 100, groupId?: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));

      const all = listTasksForGroup(groupId);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      tasks.value = all.slice(startIndex, endIndex);
      pagination.value = {
        page,
        limit,
        total_items: all.length,
        total_pages: Math.max(1, Math.ceil(all.length / limit)),
      };
    } catch (err: unknown) {
      console.error("Failed to fetch tasks", err);
      error.value = extractApiErrorMessage(err, "Не удалось загрузить список задач");
    } finally {
      isLoading.value = false;
    }
  };

  const uploadTask = async (audio: File, data: UploadTaskData, groupId: string) => {
    isUploading.value = true;
    error.value = null;

    try {
      const response = await tasksService.upload(audio, data);
      const taskId = response.task_id?.trim() || crypto.randomUUID();
      const status = response.status?.trim() || "processing_transcribe";

      const stored: StoredTask = {
        task_id: taskId,
        task_name: data.task_name,
        description: data.description,
        original_filename: response.original_filename,
        meeting_date: formatMeetingDateLabel(data.meeting_date ?? response.created_at),
        duration_seconds: response.duration_seconds,
        status,
        group_id: groupId,
        created_at: response.created_at,
        estimated_wait_seconds: response.estimated_wait_seconds,
      };

      upsertStoredTask(stored);
      return { ...response, task_id: taskId, status };
    } catch (err: unknown) {
      error.value = extractApiErrorMessage(err, "Не удалось загрузить запись");
      throw err;
    } finally {
      isUploading.value = false;
    }
  };

  const getTaskDetail = (taskId: string): TaskDetail | null => {
    if (DEMO_TASKS_ENABLED) {
      const demo = getDemoTaskDetail(taskId);
      if (demo) return demo;
    }

    const stored = readStoredTasks().find((t) => t.task_id === taskId);
    if (!stored) return null;

    if (stored.status === "done") {
      return {
        ...stored,
        summary: stored.task_name
          ? `Конспект для «${stored.task_name}» будет доступен после завершения обработки на сервере.`
          : "Конспект будет доступен после завершения обработки.",
        transcript: [],
      };
    }

    return buildProcessingDetail(stored);
  };

  return {
    tasks,
    pagination,
    isLoading,
    isUploading,
    error,
    fetchTasks,
    uploadTask,
    getTaskDetail,
  };
});
