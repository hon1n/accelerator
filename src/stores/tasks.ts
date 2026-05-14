// src/stores/tasks.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { TasksService } from "../api/tasks.service";
import type { TaskListItem, Pagination } from "../types/tasks";

// ============================================================================
// БЛОК MOCK-ДАННЫХ (УДАЛИТЬ ПОСЛЕ ПЕРЕХОДА НА РЕАЛЬНЫЙ БЕКЕНД)
// ============================================================================
const USE_MOCK = true;

const generateMockTasks = (): TaskListItem[] => {
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
};

const MOCK_DB = generateMockTasks();
// ============================================================================
// КОНЕЦ БЛОКА MOCK-ДАННЫХ
// ============================================================================

export const useTasksStore = defineStore("tasks", () => {
  const tasks = ref<TaskListItem[]>([]);
  const pagination = ref<Pagination | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchTasks = async (page = 1, limit = 5, groupId?: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      if (USE_MOCK) {
        await new Promise((resolve) => setTimeout(resolve, 600));

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        tasks.value = MOCK_DB.slice(startIndex, endIndex);
        pagination.value = {
          page: page,
          limit: limit,
          total_items: MOCK_DB.length,
          total_pages: Math.ceil(MOCK_DB.length / limit),
        };
      } else {
        const data = await TasksService.getTasks(page, limit, groupId);
        tasks.value = data.tasks;
        pagination.value = data.pagination;
      }
    } catch (err: any) {
      console.error("Failed to fetch tasks", err);
      error.value = "Не удалось загрузить список задач";
    } finally {
      isLoading.value = false;
    }
  };

  return {
    tasks,
    pagination,
    isLoading,
    error,
    fetchTasks,
  };
});
