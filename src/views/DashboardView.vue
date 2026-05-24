<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { Plus, Search, ChevronDown } from "@lucide/vue";
import Header from "../components/layout/Header.vue";
import TaskCard from "../components/features/TaskCard.vue";
import Pagination from "../components/ui/Pagination.vue";
import Button from "../components/ui/Button.vue";
import Input from "../components/ui/Input.vue";
import Select from "../components/ui/Select.vue";
import Spinner from "../components/ui/Spinner.vue";
import Dropdown from "../components/ui/Dropdown.vue";
import { useTasksStore } from "../stores/tasks";
import { useGroupsStore } from "../stores/groups";

const router = useRouter();
const tasksStore = useTasksStore();
const groupsStore = useGroupsStore();

const searchQuery = ref("");
const selectedDate = ref("");
const selectedStatus = ref("");
const currentPage = ref(1);
const itemsPerPage = 12;

const handleGroupSelect = async (groupId: string) => {
  await groupsStore.selectGroup(groupId);
  await tasksStore.fetchTasks(1, 100, groupId);
};

const dateOptions = [
  { value: "", label: "Дата" },
  { value: "today", label: "За сегодня" },
  { value: "week", label: "За эту неделю" },
  { value: "month", label: "За этот месяц" },
];

const statusOptions = [
  { value: "", label: "Статус" },
  { value: "done", label: "Готово" },
  { value: "processing", label: "В процессе" },
  { value: "error", label: "Ошибка" },
];

const filteredTasks = computed(() => {
  let tasks = tasksStore.tasks;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    tasks = tasks.filter(
      (task) =>
        (task.task_name || "").toLowerCase().includes(query) ||
        task.original_filename.toLowerCase().includes(query),
    );
  }

  if (selectedStatus.value) {
    if (selectedStatus.value === "processing") {
      tasks = tasks.filter(
        (task) =>
          task.status === "processing_transcribe" || task.status === "processing_summary",
      );
    } else {
      tasks = tasks.filter((task) => task.status === selectedStatus.value);
    }
  }

  return tasks;
});

const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredTasks.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredTasks.value.length / itemsPerPage);
});

const handlePageChange = (page: number) => {
  currentPage.value = page;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const handleCreateTask = () => {
  router.push({ name: "RecordCreate" });
};

watch([searchQuery, selectedDate, selectedStatus], () => {
  currentPage.value = 1;
});

watch(
  () => groupsStore.activeGroupId,
  async (newGroupId) => {
    await tasksStore.fetchTasks(1, 100, newGroupId ?? undefined);
  },
);

onMounted(async () => {
  try {
    await groupsStore.fetchGroups();
  } catch {
    // если группы не подгрузились (нет авторизации, бекенд недоступен и т.п.),
    // всё равно показываем локальные/демо записи
  }
  await tasksStore.fetchTasks(1, 100, groupsStore.activeGroupId ?? undefined);
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-dark">
    <Header />

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Page Header -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Список задач</p>
          <h1 class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            Группа:
            {{
              groupsStore.activeGroup?.name || "Пусто"
            }}
          </h1>
        </div>

        <!-- Group Selector -->
        <Dropdown align="right">
          <template #trigger>
            <button
              class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-dark-border dark:bg-dark-card dark:text-gray-200 dark:hover:bg-dark-elevated"
            >
              {{ groupsStore.activeGroup?.name || "Выберите группу" }}
              <ChevronDown :size="16" class="text-gray-400" />
            </button>
          </template>

          <template #content="{ close }">
            <div class="max-h-64 overflow-y-auto">
              <button
                v-for="group in groupsStore.groups"
                :key="group.group_id"
                class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-elevated"
                :class="{
                  'bg-blue-50 text-blue-600 dark:bg-white/10 dark:text-white':
                    groupsStore.activeGroupId === group.group_id,
                }"
                @click="
                  () => {
                    handleGroupSelect(group.group_id);
                    close();
                  }
                "
              >
                {{ group.name }}
              </button>
            </div>
          </template>
        </Dropdown>
      </div>

      <!-- Filters and Actions -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
          <div class="relative flex-1 sm:max-w-xs">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search :size="18" class="text-gray-400" />
            </div>
            <Input
              v-model="searchQuery"
              placeholder="Найти запись"
              class="pl-10"
            />
          </div>

          <Select v-model="selectedDate" :options="dateOptions" class="sm:w-48" />
          <Select v-model="selectedStatus" :options="statusOptions" class="sm:w-48" />
        </div>

        <Button @click="handleCreateTask">
          <Plus :size="18" />
          Создать запись
        </Button>
      </div>

      <!-- Loading State -->
      <div v-if="tasksStore.isLoading" class="flex items-center justify-center py-12">
        <Spinner size="lg" class="text-blue-600 dark:text-white" />
      </div>

      <!-- Error State -->
      <div
        v-else-if="tasksStore.error"
        class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
      >
        <p class="text-red-600 dark:text-red-400">{{ tasksStore.error }}</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredTasks.length === 0"
        class="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-dark-border dark:bg-dark-card"
      >
        <p class="text-gray-500 dark:text-gray-400">
          {{ searchQuery || selectedStatus ? "Записи не найдены" : "Список записей пуст" }}
        </p>
      </div>

      <!-- Tasks Grid -->
      <div v-else class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <TaskCard v-for="task in paginatedTasks" :key="task.task_id" :task="task" />
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="mt-6">
          <Pagination
            :current-page="currentPage"
            :total-pages="totalPages"
            :total-items="filteredTasks.length"
            :items-per-page="itemsPerPage"
            @page-change="handlePageChange"
          />
        </div>
      </div>
    </main>
  </div>
</template>
