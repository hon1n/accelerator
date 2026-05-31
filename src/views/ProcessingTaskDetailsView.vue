<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Users,
  Hourglass
} from "@lucide/vue";
import Header from "../components/layout/Header.vue";
import Card from "../components/ui/Card.vue";
import Badge from "../components/ui/Badge.vue";
import Spinner from "../components/ui/Spinner.vue";
import { useTasksStore, UPLOADING_TASK_ID } from "../stores/tasks";
import {
  PIPELINE_STATUSES,
  formatHms,
  formatMinutes,
  isDone,
  isError,
  isPending,
  isProcessing,
  stageLabel,
  toUiStatus,
} from "../utils/taskStatus";
import type { TaskStatus } from "../api/tasks.types";

interface Stage {
  status: TaskStatus;
  name: string;
  description: string;
  state: "completed" | "in_progress" | "pending" | "error";
  detail: string;
  isCurrent: boolean;
  /** Прогресс передачи файла (только для этапа загрузки), 0..100 */
  progress: number | null;
}

const route = useRoute();
const router = useRouter();
const tasksStore = useTasksStore();

const taskId = computed(() => route.params.id as string);
const isUploadingPhase = computed(() => taskId.value === UPLOADING_TASK_ID);

const isLoading = ref(true);
const error = ref<string | null>(null);
const elapsedSeconds = ref(0);

/** Прогресс передачи файла на сервер (0..100) во время фазы загрузки. */
const uploadProgress = computed(() => tasksStore.activeUpload?.progress ?? 0);

/** Имя записи: из загруженной задачи либо из активной загрузки. */
const displayName = computed(
  () =>
    tasksStore.currentTask?.task_name ||
    tasksStore.activeUpload?.taskName ||
    "Запись",
);

let elapsedTimer: ReturnType<typeof setInterval> | null = null;
let stopPoll: (() => void) | null = null;
let disposed = false;

/**
 * Текущий «представительный» этап для шкалы.
 * Все *_pending → ожидание (предыдущий этап в группе).
 */
const STAGE_GROUPS: Array<{
  statuses: TaskStatus[];
  name: string;
  description: string;
}> = [
  {
    statuses: ["processing_upload"],
    name: "Загрузка файла",
    description: "Аудиофайл сохраняется в хранилище и подготавливается к обработке.",
  },
  {
    statuses: ["pending_denoise", "processing_denoise"],
    name: "Шумоподавление",
    description: "Удаляются фоновые шумы для повышения качества распознавания.",
  },
  {
    statuses: ["pending_transcribe", "processing_transcribe"],
    name: "Распознавание речи",
    description: "Аудио преобразуется в текст с разметкой по времени.",
  },
  {
    statuses: ["pending_diarize", "processing_diarize"],
    name: "Диаризация",
    description: "Определяется количество спикеров и их реплики.",
  },
  {
    statuses: ["pending_summarize", "processing_summarize"],
    name: "Создание конспекта",
    description: "Формируется итоговый конспект встречи по выбранному шаблону.",
  },
];

const currentStatus = computed<TaskStatus | null>(() => {
  // Пока файл ещё передаётся на сервер, реального статуса нет — показываем
  // первый этап «Загрузка файла» как активный.
  if (isUploadingPhase.value && !tasksStore.currentTask) {
    return "processing_upload";
  }
  return tasksStore.currentStatus?.status ?? tasksStore.currentTask?.status ?? null;
});

const currentStageIndex = computed(() => {
  const status = currentStatus.value;
  if (!status) return 0;
  return STAGE_GROUPS.findIndex((g) => g.statuses.includes(status));
});

const stages = computed<Stage[]>(() =>
  STAGE_GROUPS.map((group, index) => {
    const idx = currentStageIndex.value;
    const status = currentStatus.value;

    let state: Stage["state"];
    if (idx === -1) {
      state = "pending";
    } else if (index < idx) {
      state = "completed";
    } else if (index === idx) {
      const s = status!;
      if (isError(s)) state = "error";
      else if (isProcessing(s)) state = "in_progress";
      else if (isPending(s)) state = "pending";
      else state = "in_progress";
    } else {
      state = "pending";
    }

    const isCurrent = index === idx;
    // Этап загрузки во время передачи файла показывает реальный прогресс.
    const isUploadStage = group.statuses[0] === "processing_upload";
    const progress =
      isUploadStage && isCurrent && isUploadingPhase.value && !tasksStore.currentTask
        ? uploadProgress.value
        : null;
    const detail = buildStageDetail(state, isCurrent, progress);

    return {
      status: group.statuses[0],
      name: group.name,
      description: group.description,
      state,
      detail,
      isCurrent,
      progress,
    };
  }),
);

function buildStageDetail(
  state: Stage["state"],
  isCurrent: boolean,
  progress: number | null,
): string {
  if (state === "completed") return "Этап успешно завершён";
  if (state === "error") return "На этом этапе произошла ошибка";

  if (!isCurrent) return "Ожидает запуска";

  // Этап передачи файла на сервер: показываем процент загрузки.
  if (progress !== null) {
    return progress >= 100
      ? "Файл передан, начинаем обработку…"
      : `Передача файла на сервер — ${progress}%`;
  }

  if (state === "pending") {
    if (queueBefore.value > 0) {
      const word =
        queueBefore.value === 1
          ? "задача"
          : queueBefore.value >= 2 && queueBefore.value <= 4
            ? "задачи"
            : "задач";
      return `В очереди — перед вами ${queueBefore.value} ${word}`;
    }
    return "В очереди — скоро начнётся";
  }

  // in_progress
  if (leadTimeMinutes.value > 0) {
    return `Идёт обработка, осталось ~${formatMinutes(leadTimeMinutes.value).replace(/^~/, "")}`;
  }
  return "Идёт обработка";
}

const queueBefore = computed(
  () => tasksStore.currentStatus?.in_the_queue_before ?? 0,
);
const leadTimeMinutes = computed(
  () => tasksStore.currentStatus?.approximate_lead_time_process ?? 0,
);

const isInQueue = computed(() => {
  const s = currentStatus.value;
  return s ? isPending(s) : false;
});
const taskDurationSeconds = computed(
  () => tasksStore.currentTask?.duration_seconds ?? 0,
);

const formattedElapsed = computed(() => formatHms(elapsedSeconds.value));
const formattedDuration = computed(() => formatHms(taskDurationSeconds.value));
const formattedLeadTime = computed(() =>
  leadTimeMinutes.value > 0 ? formatMinutes(leadTimeMinutes.value) : "—",
);

function getStageIcon(state: Stage["state"]) {
  switch (state) {
    case "completed":
      return CheckCircle2;
    case "in_progress":
      return Loader2;
    case "error":
      return AlertCircle;
    default:
      return Clock;
  }
}

function getStageVariant(state: Stage["state"]) {
  switch (state) {
    case "completed":
      return "success" as const;
    case "in_progress":
      return "warning" as const;
    case "error":
      return "error" as const;
    default:
      return "default" as const;
  }
}

function getStageLabel(state: Stage["state"]) {
  switch (state) {
    case "completed":
      return "Завершено";
    case "in_progress":
      return "В процессе";
    case "error":
      return "Ошибка";
    default:
      return "Запланировано";
  }
}

function startElapsedTimer(): void {
  if (elapsedTimer !== null) return;
  elapsedTimer = setInterval(() => {
    elapsedSeconds.value += 1;
  }, 1000);
}

onMounted(async () => {
  // ----- Фаза передачи файла на сервер (псевдо-ID "uploading") -----
  if (isUploadingPhase.value) {
    const upload = tasksStore.activeUpload;

    // Прямой заход по ссылке /records/uploading без активной загрузки — некуда вести.
    if (!upload) {
      void router.replace({ name: "Dashboard" });
      return;
    }

    isLoading.value = false;
    startElapsedTimer();

    try {
      const response = await upload.promise;
      if (disposed) return;
      // Файл передан — заменяем псевдо-ID на настоящий и продолжаем как обычно.
      await router.replace({
        name: "RecordProcessingDetails",
        params: { id: response.task_id },
      });
      // taskId пересчитается из route; запускаем обычную инициализацию.
      await initTask(response.task_id, false);
    } catch {
      if (disposed) return;
      error.value = tasksStore.activeUpload?.error ?? "Не удалось загрузить запись";
    }
    return;
  }

  // ----- Обычная инициализация по реальному task_id -----
  await initTask(taskId.value);
});

async function initTask(id: string, showLoading = true): Promise<void> {
  if (showLoading) isLoading.value = true;
  try {
    const task = await tasksStore.fetchTask(id);
    if (disposed) return;

    if (isDone(task.status)) {
      void router.replace({ name: "RecordDetails", params: { id: task.task_id } });
      return;
    }
    if (isError(task.status)) {
      error.value = "Обработка завершилась с ошибкой";
      isLoading.value = false;
      return;
    }

    // Инициализируем «прошедшее время» от created_at, если оно валидное.
    const created = new Date(task.created_at);
    if (!Number.isNaN(created.getTime())) {
      elapsedSeconds.value = Math.max(
        0,
        Math.floor((Date.now() - created.getTime()) / 1000),
      );
    }

    isLoading.value = false;
    startElapsedTimer();

    // Сразу опрашиваем статус (внутри store уже обновит currentStatus и currentTask).
    stopPoll = tasksStore.pollStatus(task.task_id, {
      onDone: (done) => {
        void router.replace({ name: "RecordDetails", params: { id: done.task_id } });
      },
      onError: () => {
        error.value = "Обработка завершилась с ошибкой";
      },
    });
  } catch (err: unknown) {
    if (disposed) return;
    error.value =
      tasksStore.currentError ??
      (err instanceof Error ? err.message : "Не удалось загрузить задачу");
    isLoading.value = false;
  }
}

onUnmounted(() => {
  disposed = true;
  if (elapsedTimer !== null) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
  stopPoll?.();
  tasksStore.stopPolling();
  tasksStore.clearActiveUpload();
});

// Подсветка состояния — на основании сводного UI-статуса.
const uiStatus = computed(() =>
  currentStatus.value ? toUiStatus(currentStatus.value) : "unknown",
);

// Обнаружение, что пайплайн содержит наш статус (на случай неизвестных будущих).
const isKnownPipelineStatus = computed(() => {
  const s = currentStatus.value;
  if (!s) return false;
  return PIPELINE_STATUSES.includes(s);
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-gray-50 dark:bg-dark">
    <Header max-width="max-w-[1200px]" />

    <main class="mx-auto flex w-full min-h-0 max-w-[1200px] flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div class="mb-6 shrink-0">
        <button
          type="button"
          class="mb-4 flex cursor-pointer items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          @click="router.push({ name: 'Dashboard' })"
        >
          <ArrowLeft :size="16" />
          Главная
        </button>
        <p class="text-sm text-gray-500 dark:text-gray-400">Запись в процессе обработки</p>
        <h1 class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          {{ displayName }}
        </h1>
        <p
          v-if="currentStatus"
          class="mt-1 text-sm"
          :class="{
            'text-yellow-700 dark:text-yellow-400': uiStatus === 'processing',
            'text-blue-700 dark:text-blue-300': uiStatus === 'pending',
            'text-red-700 dark:text-red-400': uiStatus === 'error',
            'text-gray-500 dark:text-gray-400': uiStatus === 'unknown',
          }"
        >
          {{ stageLabel(currentStatus) }}
        </p>
      </div>

      <div v-if="isLoading" class="flex flex-1 items-center justify-center">
        <Spinner size="lg" class="text-blue-600 dark:text-white" />
      </div>

      <div
        v-else-if="error"
        class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
      >
        <p class="text-red-600 dark:text-red-400">{{ error }}</p>
      </div>

      <template v-else>
        <div class="mb-6 grid shrink-0 gap-4 sm:grid-cols-3">
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
                  {{ formattedElapsed }}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
              >
                <span class="hourglass-flip inline-flex">
                  <Hourglass :size="20" class="animate-hourglass-flip" />
                </span>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">ДЛИТЕЛЬНОСТЬ АУДИОЗАПИСИ</p>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ taskDurationSeconds > 0 ? formattedDuration : "—" }}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-lg"
                :class="
                  isInQueue
                    ? 'bg-blue-100 text-blue-600 dark:bg-white/10 dark:text-gray-300'
                    : 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                "
              >
                <Users v-if="isInQueue" :size="20" />
                <Clock v-else :size="20" />
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ isInQueue ? "ОЧЕРЕДЬ ПЕРЕД ВАМИ" : "ОСТАВШЕЕСЯ ВРЕМЯ" }}
                </p>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  <template v-if="isInQueue">
                    {{ queueBefore }}
                    {{
                      queueBefore === 1
                        ? "задача"
                        : queueBefore >= 2 && queueBefore <= 4
                          ? "задачи"
                          : "задач"
                    }}
                  </template>
                  <template v-else>{{ formattedLeadTime }}</template>
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div
          v-if="isKnownPipelineStatus"
          class="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
        >
          <div v-for="stage in stages" :key="stage.status" class="relative">
            <div
              :class="[
                'rounded-lg border p-4 transition-all',
                {
                  'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20':
                    stage.state === 'completed',
                  'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20':
                    stage.state === 'in_progress',
                  'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20':
                    stage.state === 'error',
                  'border-gray-200 bg-white dark:border-dark-border dark:bg-dark-card':
                    stage.state === 'pending',
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
                          stage.state === 'completed',
                        'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400':
                          stage.state === 'in_progress',
                        'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400':
                          stage.state === 'error',
                        'bg-gray-100 text-gray-400 dark:bg-dark-elevated dark:text-gray-500':
                          stage.state === 'pending',
                      },
                    ]"
                  >
                    <component
                      :is="getStageIcon(stage.state)"
                      :size="20"
                      :class="{ 'animate-spin': stage.state === 'in_progress' }"
                    />
                  </div>

                  <div class="flex-1">
                    <h3 class="font-medium text-gray-900 dark:text-white">
                      {{ stage.name }}
                    </h3>
                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {{ stage.description }}
                    </p>
                    <p
                      :class="[
                        'mt-2 text-xs font-medium',
                        {
                          'text-green-700 dark:text-green-400':
                            stage.state === 'completed',
                          'text-yellow-700 dark:text-yellow-400':
                            stage.state === 'in_progress',
                          'text-red-700 dark:text-red-400': stage.state === 'error',
                          'text-gray-500 dark:text-gray-400':
                            stage.state === 'pending',
                        },
                      ]"
                    >
                      {{ stage.detail }}
                    </p>

                    <!-- Прогресс передачи файла на сервер -->
                    <div
                      v-if="stage.progress !== null"
                      class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-yellow-100 dark:bg-yellow-500/20"
                    >
                      <div
                        class="h-full rounded-full bg-yellow-500 transition-[width] duration-200 dark:bg-yellow-400"
                        :style="{ width: `${stage.progress}%` }"
                      />
                    </div>
                  </div>
                </div>

                <Badge :variant="getStageVariant(stage.state)" size="sm">
                  {{ getStageLabel(stage.state) }}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>