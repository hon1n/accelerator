<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Clock, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "@lucide/vue";
import Header from "../components/layout/Header.vue";
import Card from "../components/ui/Card.vue";
import Badge from "../components/ui/Badge.vue";
import Spinner from "../components/ui/Spinner.vue";
import { useTasksStore } from "../stores/tasks";
import type { ProcessingStage } from "../utils/demoTasks";

const route = useRoute();
const router = useRouter();
const tasksStore = useTasksStore();

const task = ref(
  tasksStore.getTaskDetail(route.params.id as string) ?? {
    task_id: route.params.id as string,
    task_name: "Запись",
    meeting_date: "—",
    duration_seconds: 0,
    status: "processing_transcribe",
    elapsed_time: 0,
    estimated_time: 0,
    stages: [] as ProcessingStage[],
  },
);

const isLoading = ref(false);
const error = ref<string | null>(null);

const formattedElapsedTime = computed(() => formatSeconds(task.value.elapsed_time ?? 0));
const formattedDuration = computed(() => formatSeconds(task.value.duration_seconds ?? 0));
const formattedRemainingTime = computed(() => {
  const seconds = task.value.estimated_time ?? 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `~${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const getStageIcon = (status: string) => {
  switch (status) {
    case "completed":
      return CheckCircle2;
    case "in_progress":
      return Loader2;
    case "error":
      return AlertCircle;
    default:
      return Clock;
  }
};

const getStageVariant = (status: string) => {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "warning";
    case "error":
      return "error";
    default:
      return "default";
  }
};

let progressInterval: number | null = null;

onMounted(() => {
  const detail = tasksStore.getTaskDetail(route.params.id as string);
  if (!detail) {
    error.value = "Запись не найдена";
    return;
  }

  if (detail.status === "done") {
    void router.replace({ name: "RecordDetails", params: { id: detail.task_id } });
    return;
  }

  if (detail.status === "error") {
    error.value = "Обработка завершилась с ошибкой";
    return;
  }

  task.value = {
    ...detail,
    elapsed_time: detail.elapsed_time ?? 0,
    estimated_time: detail.estimated_time ?? 0,
    stages: detail.stages?.map((s) => ({ ...s })) ?? [],
  };

  progressInterval = window.setInterval(() => {
    task.value.elapsed_time = (task.value.elapsed_time ?? 0) + 1;

    const currentStage = task.value.stages?.find((s) => s.status === "in_progress");
    if (currentStage && currentStage.progress < 100) {
      currentStage.progress = Math.min(100, currentStage.progress + 0.5);
    }
  }, 1000);
});

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval);
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-dark">
    <Header />

    <main class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div class="mb-6">
        <button
          type="button"
          class="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          @click="router.push({ name: 'Dashboard' })"
        >
          <ArrowLeft :size="16" />
          Главная
        </button>
        <p class="text-sm text-gray-500 dark:text-gray-400">Запись в процессе обработки</p>
        <h1 class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          {{ task.task_name }}
        </h1>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <Spinner size="lg" class="text-blue-600 dark:text-white" />
      </div>

      <div
        v-else-if="error"
        class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
      >
        <p class="text-red-600 dark:text-red-400">{{ error }}</p>
      </div>

      <div v-else class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-3">
          <Card padding="md">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-white/10 dark:text-white"
              >
                <Clock :size="20" />
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">ПРОШЕДШЕЕ ВРЕМЯ</p>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ formattedElapsedTime }}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
              >
                <Loader2 :size="20" class="animate-spin" />
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">ДЛИТЕЛЬНОСТЬ АУДИОЗАПИСИ</p>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ formattedDuration }}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"
              >
                <Clock :size="20" />
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">ОСТАВШЕЕСЯ ВРЕМЯ</p>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ formattedRemainingTime }}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card v-if="task.stages?.length" padding="lg">
          <h2 class="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Этапы обработки</h2>

          <div class="space-y-4">
            <div
              v-for="(stage, index) in task.stages"
              :key="stage.id"
              class="relative"
            >
              <div
                :class="[
                  'rounded-lg border p-4 transition-all',
                  {
                    'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20':
                      stage.status === 'completed',
                    'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20':
                      stage.status === 'in_progress',
                    'border-gray-200 bg-white dark:border-dark-border dark:bg-dark-card':
                      stage.status === 'pending',
                  },
                ]"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-start gap-3">
                    <div
                      :class="[
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                        {
                          'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400':
                            stage.status === 'completed',
                          'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400':
                            stage.status === 'in_progress',
                          'bg-gray-100 text-gray-400 dark:bg-dark-elevated dark:text-gray-500':
                            stage.status === 'pending',
                        },
                      ]"
                    >
                      <component
                        :is="getStageIcon(stage.status)"
                        :size="20"
                        :class="{ 'animate-spin': stage.status === 'in_progress' }"
                      />
                    </div>

                    <div class="flex-1">
                      <h3 class="font-medium text-gray-900 dark:text-white">{{ stage.name }}</h3>
                      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {{ stage.estimated_time }}
                      </p>

                      <div v-if="stage.status === 'in_progress'" class="mt-3">
                        <div
                          class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-elevated"
                        >
                          <div
                            class="h-full bg-yellow-500 transition-all duration-300"
                            :style="{ width: `${stage.progress}%` }"
                          />
                        </div>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {{ Math.round(stage.progress) }}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <Badge :variant="getStageVariant(stage.status)" size="sm">
                    {{
                      stage.status === "completed"
                        ? "Завершено"
                        : stage.status === "in_progress"
                          ? "В процессе"
                          : "Запланировано"
                    }}
                  </Badge>
                </div>
              </div>

              <div
                v-if="index < (task.stages?.length ?? 0) - 1"
                class="ml-5 h-4 w-0.5 bg-gray-200 dark:bg-dark-border"
              />
            </div>
          </div>
        </Card>
      </div>
    </main>
  </div>
</template>
