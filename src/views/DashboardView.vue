<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useTasksStore } from "../stores/tasks";
import { AudioLines, ListCheck, X } from "@lucide/vue";

import Header from "../components/layout/Header.vue";

const router = useRouter();
const tasksStore = useTasksStore();

const currentPage = ref(1);
const limit = ref(5);

onMounted(() => {
  tasksStore.fetchTasks(currentPage.value, limit.value);
});

const nextPage = () => {
  if (tasksStore.pagination && currentPage.value < tasksStore.pagination.total_pages) {
    currentPage.value++;
    tasksStore.fetchTasks(currentPage.value, limit.value);
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    tasksStore.fetchTasks(currentPage.value, limit.value);
  }
};

const getUiStatus = (backendStatus: string) => {
  if (backendStatus === "done") return "done";
  if (backendStatus === "error") return "error";
  return "in_progress";
};

const formattedTasks = computed(() => {
  return tasksStore.tasks.map((task) => {
    const durationMins = task.duration_seconds ? Math.round(task.duration_seconds / 60) : 0;

    return {
      id: task.task_id,
      title: task.task_name || task.original_filename || "Без названия",
      date: task.meeting_date || "Дата не указана",
      duration: `${durationMins} мин`,
      uiStatus: getUiStatus(task.status),
    };
  });
});

const statusText = (status: string): string => {
  switch (status) {
    case "in_progress":
      return "В ПРОЦЕССЕ";
    case "done":
      return "ГОТОВО";
    case "error":
      return "ОШИБКА";
    default:
      return "";
  }
};

const goToDetails = (id: string) => {
  router.push(`/records/${id}`);
};
</script>

<template>
  <div class="dark:bg-dark min-h-screen bg-white text-gray-900 transition-colors duration-300 dark:text-gray-200">
    <Header />

    <main class="mx-auto w-full max-w-300 px-4 py-8">
      <div class="mb-6">
        <!-- Текст в тёмной теме делаем чуть контрастнее -->
        <p class="mb-1 text-sm text-[#A8A9AC] dark:text-gray-400">Список задач</p>
        <h1 class="text-xl font-semibold text-black transition-colors dark:text-white">Группа: Менеджеры</h1>
      </div>

      <!-- Главная карточка: прозрачный бордер и легкий фон в тёмной теме -->
      <div class="dark:bg-dark rounded-2xl border border-gray-200 bg-white p-6 transition-colors dark:border-[#FFFFFF10]">
        <div class="mb-6 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- Кнопки фильтров -->
            <button
              class="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Дата
              <svg class="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              class="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Статус
              <svg class="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Поиск -->
            <div class="relative ml-4 w-72">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg class="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Найти запись"
                class="focus:border-primary focus:ring-primary dark:focus:border-primary dark:bg-dark block w-full rounded-lg border border-gray-200 py-2 pr-3 pl-10 text-sm placeholder-gray-400 transition-colors focus:ring-1 focus:outline-none dark:border-[#FFFFFF10] dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>

          <!-- Кнопка создания (обычно остается акцентной в обеих темах) -->
          <button class="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Создать запись
          </button>
        </div>

        <div class="relative flex min-h-50 flex-col border-t border-gray-100 transition-colors dark:border-[#FFFFFF10]">
          <!-- Скелетон/Лоадер -->
          <div v-if="tasksStore.isLoading" class="dark:bg-dark/60 absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm transition-colors">
            <div class="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
          </div>

          <div v-else-if="tasksStore.error" class="py-10 text-center text-red-500 dark:text-red-400">
            {{ tasksStore.error }}
          </div>

          <div v-else-if="tasksStore.tasks.length === 0" class="py-10 text-center text-gray-500 dark:text-gray-400">Нет доступных записей</div>

          <!-- Список элементов -->
          <div
            v-else
            v-for="record in formattedTasks"
            :key="record.id"
            class="-mx-2 flex cursor-pointer items-center justify-between border-b border-gray-100 px-2 py-5 transition-colors hover:bg-gray-50/50 dark:border-[#FFFFFF05] dark:hover:bg-white/1"
            @click="goToDetails(record.id)"
          >
            <div class="flex items-center gap-5">
              <!-- Иконки статуса: адаптация цветов под тёмную тему -->
              <div
                :class="[
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors',
                  record.uiStatus === 'in_progress' ? 'bg-yellow-50 text-yellow-500 dark:bg-yellow-500/10 dark:text-yellow-400' : '',
                  record.uiStatus === 'done' ? 'bg-green-50 text-green-500 dark:bg-green-500/10 dark:text-green-400' : '',
                  record.uiStatus === 'error' ? 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400' : '',
                ]"
              >
                <AudioLines v-if="record.uiStatus === 'in_progress'" :size="24" />
                <ListCheck v-if="record.uiStatus === 'done'" :size="24" />
                <X v-if="record.uiStatus === 'error'" :size="24" />
              </div>

              <!-- Инфо -->
              <div>
                <h3 class="mb-1.5 text-[15px] font-semibold text-gray-900 transition-colors dark:text-white">{{ record.title }}</h3>
                <div class="flex items-center gap-3 text-sm text-gray-500 transition-colors dark:text-gray-400">
                  <span>{{ record.date }}</span>
                  <span>•</span>
                  <span>{{ record.duration }}</span>
                </div>
              </div>
            </div>

            <!-- Бейджи статуса -->
            <div
              :class="[
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tracking-wide transition-colors',
                record.uiStatus === 'in_progress' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400' : '',
                record.uiStatus === 'done' ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : '',
                record.uiStatus === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' : '',
              ]"
            >
              <svg v-if="record.uiStatus === 'in_progress'" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <svg v-if="record.uiStatus === 'done'" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-if="record.uiStatus === 'error'" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>

              {{ statusText(record.uiStatus) }}
            </div>
          </div>
        </div>

        <!-- Пагинация -->
        <div v-if="tasksStore.pagination" class="mt-4 flex items-center justify-between">
          <p class="text-sm text-gray-500 transition-colors dark:text-gray-400">
            Страница {{ tasksStore.pagination.page }} из {{ tasksStore.pagination.total_pages }} • Всего: {{ tasksStore.pagination.total_items }}
          </p>
          <div class="flex items-center gap-2">
            <button
              @click="prevPage"
              :disabled="tasksStore.pagination.page === 1 || tasksStore.isLoading"
              class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Назад
            </button>
            <button
              @click="nextPage"
              :disabled="tasksStore.pagination.page === tasksStore.pagination.total_pages || tasksStore.isLoading"
              class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Вперёд
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
