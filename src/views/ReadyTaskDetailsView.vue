<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  Clock,
  Download,
  Edit,
  Pause,
  Play,
  Trash2,
  Volume1,
  Volume2,
  VolumeX,
} from "@lucide/vue";
import Header from "../components/layout/Header.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Input from "../components/ui/Input.vue";
import Textarea from "../components/ui/Textarea.vue";
import Modal from "../components/ui/Modal.vue";
import Spinner from "../components/ui/Spinner.vue";
import FormError from "../components/ui/FormError.vue";
import DatePicker from "../components/ui/DatePicker.vue";
import { extractApiErrorMessage, patternsService, tasksService } from "../api";
import { useTasksStore } from "../stores/tasks";
import { downloadTextFile } from "../utils/download";
import {
  formatDuration,
  formatHms,
  formatMeetingDate,
  isDone,
  isError as isErrorStatus,
} from "../utils/taskStatus";
import { renderMarkdown } from "../utils/markdown";
import { speakerPillClass } from "../utils/speakerColor";
import {
  isResultEmpty,
  normalizeTaskResult,
  type NormalizedTaskResult,
} from "../utils/taskResult";

const route = useRoute();
const router = useRouter();
const tasksStore = useTasksStore();

const isLoading = ref(true);
const error = ref<string | null>(null);

const showEditModal = ref(false);
const showDeleteModal = ref(false);
const editError = ref<string | null>(null);
const deleteError = ref<string | null>(null);

const editForm = ref({
  taskName: "",
  description: "",
  meetingDate: "",
});

const patternName = ref<string | null>(null);

const task = computed(() => tasksStore.currentTask);

const normalizedResult = computed<NormalizedTaskResult>(() =>
  normalizeTaskResult(task.value?.result),
);

const hasResult = computed(() => !isResultEmpty(task.value?.result));

const renderedSummary = computed(() => renderMarkdown(normalizedResult.value.summary));

const speakerCount = computed(() => {
  const set = new Set(normalizedResult.value.transcript.map((e) => e.speaker));
  return set.size;
});

const formattedMeetingDate = computed(() => formatMeetingDate(task.value?.meeting_date));
const formattedDurationLabel = computed(() =>
  task.value && task.value.duration_seconds > 0
    ? formatDuration(task.value.duration_seconds)
    : null,
);
const speakersLabel = computed(() => {
  const n = speakerCount.value;
  if (!n) return null;
  const word = n === 1 ? "спикер" : n >= 2 && n <= 4 ? "спикера" : "спикеров";
  return `${n} ${word}`;
});

// ---- Аудиоплеер: presigned URL берём отдельным запросом к
// GET /api/v1/tasks/{taskID}/audio. Реальное воспроизведение делает
// нативный <audio>; setInterval-эмуляция больше не нужна.
const audioEl = ref<HTMLAudioElement | null>(null);
const audioUrl = ref<string | null>(null);
const audioLoadError = ref<string | null>(null);
const isAudioReady = ref(false);
const isPlaying = ref(false);
const currentTime = ref(0);
const audioDuration = ref(0);
let didRetryAfterExpire = false;

// ---- Скорость воспроизведения ----
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const playbackRate = ref(1);
const formattedPlaybackRate = computed(() => `${playbackRate.value}×`);

const applyPlaybackRate = () => {
  if (audioEl.value) {
    audioEl.value.playbackRate = playbackRate.value;
  }
};

const cyclePlaybackRate = () => {
  const idx = PLAYBACK_RATES.indexOf(playbackRate.value);
  playbackRate.value = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
  applyPlaybackRate();
};

// ---- Громкость воспроизведения ----
// volume хранится в диапазоне 0..1. При mute запоминаем предыдущее
// значение, чтобы вернуть его при повторном клике по иконке.
const volume = ref(1);
const isMuted = ref(false);
let volumeBeforeMute = 1;

const showVolumeSlider = ref(false);

const effectiveVolume = computed(() => (isMuted.value ? 0 : volume.value));

const volumePercent = computed(() => Math.round(effectiveVolume.value * 100));

const applyVolume = () => {
  if (audioEl.value) {
    audioEl.value.volume = effectiveVolume.value;
    audioEl.value.muted = isMuted.value;
  }
};

const setVolume = (next: number) => {
  const clamped = Math.min(1, Math.max(0, next));
  volume.value = clamped;
  // Любое перемещение ползунка снимает mute (кроме перетаскивания в ноль).
  isMuted.value = clamped === 0;
  applyVolume();
};

const onVolumeInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setVolume(Number(target.value) / 100);
};

const toggleMute = () => {
  if (isMuted.value) {
    isMuted.value = false;
    if (volume.value === 0) {
      volume.value = volumeBeforeMute > 0 ? volumeBeforeMute : 1;
    }
  } else {
    volumeBeforeMute = volume.value;
    isMuted.value = true;
  }
  applyVolume();
};

const totalSeconds = computed(() => {
  if (audioDuration.value > 0) return audioDuration.value;
  return task.value?.duration_seconds ?? 0;
});
const formattedCurrent = computed(() => formatHms(currentTime.value));
const formattedTotal = computed(() => formatHms(totalSeconds.value));
const progressPercent = computed(() => {
  if (totalSeconds.value <= 0) return 0;
  return Math.min(100, (currentTime.value / totalSeconds.value) * 100);
});
const canPlay = computed(() => isAudioReady.value && totalSeconds.value > 0);

async function loadAudioUrl(taskId: string): Promise<void> {
  audioLoadError.value = null;
  try {
    const { url } = await tasksService.getAudioUrl(taskId);
    audioUrl.value = url;
    didRetryAfterExpire = false;
  } catch (err: unknown) {
    audioUrl.value = null;
    isAudioReady.value = false;
    audioLoadError.value = extractApiErrorMessage(
      err,
      "Аудиозапись недоступна",
    );
  }
}

const togglePlayback = () => {
  const el = audioEl.value;
  if (!el || !canPlay.value) return;
  if (el.paused) {
    void el.play().catch((err) => {
      audioLoadError.value =
        err instanceof Error ? err.message : "Не удалось воспроизвести аудио";
    });
  } else {
    el.pause();
  }
};

const handleScrub = (event: MouseEvent) => {
  if (totalSeconds.value <= 0) return;
  const target = event.currentTarget as HTMLDivElement;
  const rect = target.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const next = ratio * totalSeconds.value;
  currentTime.value = next;
  if (audioEl.value && Number.isFinite(audioEl.value.duration)) {
    audioEl.value.currentTime = next;
  }
};

// Перевод воспроизведения на заданную секунду (клик по реплике в стенограмме).
// Если аудио ещё не готово или метка времени неизвестна — тихо выходим.
const seekTo = (seconds: number | null, autoPlay = true) => {
  if (seconds === null || !Number.isFinite(seconds)) return;
  if (!canPlay.value) return;
  const next = Math.min(Math.max(0, seconds), totalSeconds.value);
  currentTime.value = next;
  const el = audioEl.value;
  if (el && Number.isFinite(el.duration)) {
    el.currentTime = next;
    if (autoPlay && el.paused) {
      void el.play().catch(() => {
        /* автозапуск может быть заблокирован — не критично */
      });
    }
  }
};

// Индекс активной реплики: последняя, чьё время начала уже наступило.
const activeEntryIndex = computed(() => {
  const entries = normalizedResult.value.transcript;
  if (entries.length === 0) return -1;
  let active = -1;
  for (let i = 0; i < entries.length; i++) {
    const start = entries[i].startSeconds;
    if (start !== null && start <= currentTime.value + 0.25) {
      active = i;
    }
  }
  return active;
});

// Регистр DOM-элементов реплик для автопрокрутки к активной строке.
const entryRefs = new Map<number, HTMLElement>();
const setEntryRef = (el: unknown, index: number) => {
  const node =
    el && typeof el === "object" && "$el" in el
      ? ((el as { $el: HTMLElement }).$el)
      : (el as HTMLElement | null);
  if (node instanceof HTMLElement) {
    entryRefs.set(index, node);
  } else {
    entryRefs.delete(index);
  }
};

// Подсвеченную реплику держим в поле зрения, но не дёргаем экран,
// если пользователь сам её только что выбрал и она уже видна.
watch(activeEntryIndex, (index) => {
  if (index < 0) return;
  const node = entryRefs.get(index);
  if (node) {
    node.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
});

const onAudioLoaded = () => {
  const el = audioEl.value;
  if (!el) return;
  if (Number.isFinite(el.duration) && el.duration > 0) {
    audioDuration.value = el.duration;
  }
  // <audio> сбрасывает playbackRate на 1 при загрузке нового источника —
  // восстанавливаем выбранную пользователем скорость.
  el.playbackRate = playbackRate.value;
  // Аналогично восстанавливаем громкость/mute.
  el.volume = effectiveVolume.value;
  el.muted = isMuted.value;
  isAudioReady.value = true;
};

const onAudioTimeUpdate = () => {
  if (!audioEl.value) return;
  currentTime.value = audioEl.value.currentTime;
};

const onAudioPlay = () => {
  isPlaying.value = true;
};

const onAudioPause = () => {
  isPlaying.value = false;
};

const onAudioEnded = () => {
  isPlaying.value = false;
  currentTime.value = totalSeconds.value;
};

const onAudioError = async () => {
  // Возможен случай: presigned истёк за время простоя — пробуем один раз
  // перезапросить ссылку. Если и это не помогло, показываем сообщение.
  if (!task.value) return;
  if (!didRetryAfterExpire) {
    didRetryAfterExpire = true;
    isAudioReady.value = false;
    await loadAudioUrl(task.value.task_id);
    return;
  }
  audioLoadError.value = "Не удалось загрузить аудиозапись";
  isAudioReady.value = false;
};

const safeFileBase = (name: string | undefined, fallback: string) => {
  const base = (name ?? "").replace(/[<>:"/\\|?*]/g, "").trim();
  return base.length > 0 ? base : fallback;
};

const handleDownloadSummary = () => {
  if (!task.value || !normalizedResult.value.summary) return;
  const filename = `${safeFileBase(task.value.task_name, "konspekt")}.md`;
  downloadTextFile(filename, normalizedResult.value.summary, "text/markdown;charset=utf-8");
};

const handleDownloadTranscript = () => {
  if (!task.value || normalizedResult.value.transcript.length === 0) return;
  const text = normalizedResult.value.transcript
    .map((e) => `[${e.timestamp}] ${e.speaker}\n${e.text}`)
    .join("\n\n");
  const filename = `${safeFileBase(task.value.task_name, "stenogramma")}.txt`;
  downloadTextFile(filename, text);
};

const openEditModal = () => {
  if (!task.value) return;
  const meetingDate = task.value.meeting_date ? new Date(task.value.meeting_date) : null;
  const dateInput =
    meetingDate && !Number.isNaN(meetingDate.getTime())
      ? meetingDate.toISOString().slice(0, 10)
      : "";

  editForm.value = {
    taskName: task.value.task_name,
    description: task.value.description,
    meetingDate: dateInput,
  };
  editError.value = null;
  showEditModal.value = true;
};

const handleSaveEdit = async () => {
  if (!task.value) return;
  editError.value = null;

  const payload: Record<string, string | undefined> = {};
  if (editForm.value.taskName.trim() !== task.value.task_name) {
    payload.task_name = editForm.value.taskName.trim();
  }
  if (editForm.value.description.trim() !== task.value.description) {
    payload.description = editForm.value.description.trim();
  }
  if (editForm.value.meetingDate) {
    const newIso = new Date(`${editForm.value.meetingDate}T12:00:00`).toISOString();
    if (newIso !== task.value.meeting_date) {
      payload.meeting_date = newIso;
    }
  }

  if (Object.keys(payload).length === 0) {
    showEditModal.value = false;
    return;
  }

  try {
    await tasksStore.updateTask(task.value.task_id, payload);
    showEditModal.value = false;
  } catch (err: unknown) {
    editError.value = extractApiErrorMessage(err, "Не удалось сохранить изменения");
  }
};

const handleDelete = async () => {
  if (!task.value) return;
  deleteError.value = null;
  try {
    await tasksStore.deleteTask(task.value.task_id);
    showDeleteModal.value = false;
    router.push({ name: "Dashboard" });
  } catch (err: unknown) {
    deleteError.value = extractApiErrorMessage(err, "Не удалось удалить запись");
  }
};

onMounted(async () => {
  try {
    const fetched = await tasksStore.fetchTask(route.params.id as string);

    if (isErrorStatus(fetched.status)) {
      error.value = "Обработка завершилась с ошибкой";
      isLoading.value = false;
      return;
    }

    if (!isDone(fetched.status)) {
      void router.replace({
        name: "RecordProcessingDetails",
        params: { id: fetched.task_id },
      });
      return;
    }

    isLoading.value = false;

    // Параллельно: подгружаем шаблон (если есть) и presigned URL аудио.
    // Ошибки в обоих случаях не критичны — просто скрываем соответствующий UI.
    void loadAudioUrl(fetched.task_id);

    if (fetched.pattern_id) {
      try {
        const pattern = await patternsService.getPatternById(fetched.pattern_id);
        patternName.value = pattern.name;
      } catch {
        // если шаблон удалён или недоступен — просто не показываем
      }
    }
  } catch (err: unknown) {
    error.value =
      tasksStore.currentError ??
      (err instanceof Error ? err.message : "Не удалось загрузить запись");
    isLoading.value = false;
  }
});

onUnmounted(() => {
  // Если пользователь уходит со страницы во время воспроизведения — глушим звук.
  const el = audioEl.value;
  if (el) {
    el.pause();
    el.src = "";
  }
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-gray-50 dark:bg-dark">
    <Header max-width="max-w-[1800px]" />

    <main class="mx-auto flex w-full min-h-0 max-w-[1800px] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div v-if="isLoading" class="flex flex-1 items-center justify-center">
        <Spinner size="lg" class="text-blue-600 dark:text-white" />
      </div>

      <div
        v-else-if="error"
        class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
      >
        <p class="text-red-600 dark:text-red-400">{{ error }}</p>
      </div>

      <template v-else-if="task">
        <button
          type="button"
          class="mb-4 flex shrink-0 cursor-pointer items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          @click="router.push({ name: 'Dashboard' })"
        >
          <ArrowLeft :size="16" />
          Главная
        </button>

        <!-- Шапка: заголовок, метаданные и действия -->
        <div class="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-2xl font-bold text-gray-900 dark:text-white">
              {{ task.task_name || "Без названия" }}
            </h1>
            <p class="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Clock :size="14" class="shrink-0" />
              <span>
                {{ formattedMeetingDate }}
                <template v-if="formattedDurationLabel"> • {{ formattedDurationLabel }}</template>
                <template v-if="speakersLabel"> • {{ speakersLabel }}</template>
              </span>
            </p>
          </div>

          <div v-if="task.change_flag" class="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" @click="openEditModal">
              <Edit :size="16" />
              Редактировать
            </Button>
            <Button variant="outline" size="sm" @click="showDeleteModal = true">
              <Trash2 :size="16" />
              Удалить
            </Button>
          </div>
        </div>

        <!-- Аудиоплеер -->
        <div
          class="mb-6 shrink-0 rounded-2xl border border-gray-200 bg-white/80 p-3 backdrop-blur dark:border-dark-border dark:bg-dark-card/80 sm:p-4"
        >
          <audio
            v-if="audioUrl"
            ref="audioEl"
            :src="audioUrl"
            preload="metadata"
            class="hidden"
            @loadedmetadata="onAudioLoaded"
            @timeupdate="onAudioTimeUpdate"
            @play="onAudioPlay"
            @pause="onAudioPause"
            @ended="onAudioEnded"
            @error="onAudioError"
          />

          <div class="flex items-center gap-3 sm:gap-4">
            <!-- Play / Pause -->
            <button
              type="button"
              :disabled="!canPlay"
              class="flex h-12 w-12 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/20 transition-all hover:scale-105 hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100 dark:bg-white dark:text-dark dark:shadow-none dark:hover:bg-gray-200"
              :title="
                audioLoadError
                  ? audioLoadError
                  : !audioUrl
                    ? 'Загрузка аудио…'
                    : isPlaying
                      ? 'Пауза'
                      : 'Воспроизвести'
              "
              @click="togglePlayback"
            >
              <Play v-if="!isPlaying" :size="20" class="ml-0.5" />
              <Pause v-else :size="20" />
            </button>

            <!-- Шкала прогресса + тайминги -->
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <span class="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {{ formattedCurrent }}
              </span>
              <div
                class="group relative flex-1 cursor-pointer py-2"
                @click="handleScrub"
              >
                <div
                  class="relative h-1.5 w-full rounded-full bg-gray-200 transition-all group-hover:h-2.5 dark:bg-dark-elevated"
                >
                  <div
                    class="absolute inset-y-0 left-0 rounded-full bg-blue-500 dark:bg-white"
                    :style="{ width: `${progressPercent}%` }"
                  />
                  <div
                    class="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 shadow ring-2 ring-white transition-opacity dark:bg-white dark:ring-dark-card"
                    :class="totalSeconds > 0 ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'"
                    :style="{ left: `${progressPercent}%` }"
                  />
                </div>
              </div>
              <span class="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {{ formattedTotal }}
              </span>
            </div>

            <!-- Громкость + скорость -->
            <div class="flex flex-shrink-0 items-center gap-1 sm:gap-2">
              <div
                class="relative flex items-center"
                @mouseenter="showVolumeSlider = true"
                @mouseleave="showVolumeSlider = false"
              >
                <button
                  type="button"
                  :disabled="!canPlay"
                  class="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-dark-elevated"
                  :title="isMuted || effectiveVolume === 0 ? 'Включить звук' : 'Выключить звук'"
                  @click="toggleMute"
                >
                  <VolumeX v-if="isMuted || effectiveVolume === 0" :size="18" />
                  <Volume1 v-else-if="effectiveVolume < 0.5" :size="18" />
                  <Volume2 v-else :size="18" />
                </button>
                <transition
                  enter-active-class="transition duration-150 ease-out"
                  enter-from-class="opacity-0 translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition duration-100 ease-in"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1"
                >
                  <div
                    v-show="showVolumeSlider"
                    class="absolute left-1/2 top-full z-10 mt-1 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-lg dark:border-dark-border dark:bg-dark-card"
                  >
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      :value="volumePercent"
                      :disabled="!canPlay"
                      class="volume-slider h-1.5 w-24 cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-50"
                      :style="{
                        background: `linear-gradient(to right, var(--volume-fill) 0%, var(--volume-fill) ${volumePercent}%, var(--volume-track) ${volumePercent}%, var(--volume-track) 100%)`,
                      }"
                      aria-label="Громкость"
                      @input="onVolumeInput"
                    />
                    <span
                      class="w-8 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400"
                    >
                      {{ volumePercent }}
                    </span>
                  </div>
                </transition>
              </div>
              <button
                type="button"
                :disabled="!canPlay"
                class="flex h-10 min-w-[3rem] flex-shrink-0 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-semibold tabular-nums text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-dark-elevated"
                title="Скорость воспроизведения"
                @click="cyclePlaybackRate"
              >
                {{ formattedPlaybackRate }}
              </button>
            </div>
          </div>

          <p
            v-if="audioLoadError"
            class="mt-2 px-1 text-xs text-red-500 dark:text-red-400"
          >
            {{ audioLoadError }}
          </p>
        </div>

        <p
          v-if="task.description"
          class="mb-6 shrink-0 whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300"
        >
          {{ task.description }}
        </p>

        <div
          v-if="!hasResult"
          class="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-dark-border dark:bg-dark-card"
        >
          <p class="text-gray-500 dark:text-gray-400">
            Результат обработки пока недоступен.
          </p>
        </div>

        <div v-else class="grid min-h-0 flex-1 gap-6 lg:grid-cols-2">
          <!-- Конспект -->
          <Card padding="lg" class="flex min-h-0 flex-col">
            <div class="mb-2 flex shrink-0 items-start justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">Конспект</h2>
                <p v-if="patternName" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Шаблон: {{ patternName }}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                :disabled="!normalizedResult.summary"
                @click="handleDownloadSummary"
              >
                <Download :size="14" />
                Скачать
              </Button>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto pr-1">
              <div
                v-if="normalizedResult.summary"
                class="summary-content text-sm text-gray-800 dark:text-gray-200"
                v-html="renderedSummary"
              />
              <p v-else class="text-sm text-gray-500 dark:text-gray-400">
                Конспект ещё не сформирован.
              </p>
            </div>
          </Card>

          <!-- Стенограмма -->
          <Card padding="lg" class="flex min-h-0 flex-col">
            <div class="mb-4 flex shrink-0 items-center justify-between">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">Стенограмма</h2>
              <Button
                variant="outline"
                size="sm"
                :disabled="normalizedResult.transcript.length === 0"
                @click="handleDownloadTranscript"
              >
                <Download :size="14" />
                Скачать
              </Button>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto pr-1">
              <div v-if="normalizedResult.transcript.length > 0" class="space-y-1">
                <component
                  :is="entry.startSeconds !== null && canPlay ? 'button' : 'div'"
                  v-for="(entry, index) in normalizedResult.transcript"
                  :key="index"
                  :type="entry.startSeconds !== null && canPlay ? 'button' : undefined"
                  :ref="(el: any) => setEntryRef(el, index)"
                  :class="[
                    'block w-full space-y-2 rounded-lg px-3 py-2 text-left transition-colors',
                    entry.startSeconds !== null && canPlay
                      ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-elevated'
                      : '',
                    index === activeEntryIndex
                      ? 'bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:ring-blue-500/30'
                      : '',
                  ]"
                  :title="
                    entry.startSeconds !== null && canPlay
                      ? `Перейти к ${entry.timestamp || formatHms(entry.startSeconds)}`
                      : undefined
                  "
                  @click="seekTo(entry.startSeconds)"
                >
                  <div class="flex items-center justify-between gap-3">
                    <span
                      :class="[
                        'inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide',
                        speakerPillClass(entry.speaker),
                      ]"
                    >
                      {{ entry.speaker }}
                    </span>
                    <span
                      v-if="entry.timestamp"
                      class="flex items-center gap-1 text-xs tabular-nums transition-colors"
                      :class="
                        index === activeEntryIndex
                          ? 'text-blue-600 dark:text-blue-300'
                          : 'text-gray-400 dark:text-gray-500'
                      "
                    >
                      <Play
                        v-if="entry.startSeconds !== null && canPlay"
                        :size="11"
                        class="shrink-0"
                      />
                      {{ entry.timestamp }}
                    </span>
                  </div>
                  <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {{ entry.text }}
                  </p>
                </component>
              </div>
              <p v-else class="text-sm text-gray-500 dark:text-gray-400">
                Стенограмма недоступна.
              </p>
            </div>
          </Card>
        </div>
      </template>
    </main>

    <Modal v-model="showEditModal" title="Редактировать запись" size="md" :close-on-click-outside="false">
      <form @submit.prevent="handleSaveEdit" class="space-y-4">
        <FormError :message="editError" />
        <Input v-model="editForm.taskName" label="Название" />
        <Textarea v-model="editForm.description" label="Описание" :rows="4" />
        <DatePicker v-model="editForm.meetingDate" label="Дата встречи" />
      </form>

      <template #footer>
        <Button @click="handleSaveEdit" :is-loading="tasksStore.isMutating">Сохранить</Button>
      </template>
    </Modal>

    <Modal v-model="showDeleteModal" title="Удалить запись?" size="sm">
      <div class="space-y-4">
        <FormError :message="deleteError" />
        <p class="text-gray-700 dark:text-gray-300">
          Вы уверены, что хотите удалить эту запись? Действие нельзя отменить.
        </p>
      </div>

      <template #footer>
        <Button @click="handleDelete" :is-loading="tasksStore.isMutating">Удалить</Button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.summary-content :deep(h1) {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 1.25rem 0 0.5rem;
  color: inherit;
}
.summary-content :deep(h2) {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 1rem 0 0.5rem;
}
.summary-content :deep(h3) {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0.75rem 0 0.4rem;
}
.summary-content :deep(p) {
  margin: 0.5rem 0;
  line-height: 1.55;
}
.summary-content :deep(ul),
.summary-content :deep(ol) {
  margin: 0.4rem 0 0.6rem 1.25rem;
  line-height: 1.55;
}
.summary-content :deep(ul) {
  list-style: disc;
}
.summary-content :deep(ol) {
  list-style: decimal;
}
.summary-content :deep(li) {
  margin: 0.2rem 0;
}
.summary-content :deep(li > ul),
.summary-content :deep(li > ol) {
  margin-top: 0.2rem;
  margin-bottom: 0.2rem;
}
.summary-content :deep(strong) {
  font-weight: 700;
}
.summary-content :deep(em) {
  font-style: italic;
}
.summary-content :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: rgba(0, 0, 0, 0.05);
  padding: 0.05rem 0.35rem;
  border-radius: 0.25rem;
  font-size: 0.85em;
}
.dark .summary-content :deep(code) {
  background: rgba(255, 255, 255, 0.08);
}
.summary-content > :first-child {
  margin-top: 0;
}
.summary-content > :last-child {
  margin-bottom: 0;
}

/* ---- Ползунок громкости ---- */
.volume-slider {
  --volume-fill: #2563eb; /* blue-600 */
  --volume-track: #e5e7eb; /* gray-200 */
}
.dark .volume-slider {
  --volume-fill: #ffffff;
  --volume-track: #2a2a2a; /* dark-elevated */
}
.volume-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  height: 0.75rem;
  width: 0.75rem;
  border-radius: 9999px;
  background: var(--volume-fill);
  border: none;
  cursor: pointer;
}
.volume-slider::-moz-range-thumb {
  height: 0.75rem;
  width: 0.75rem;
  border-radius: 9999px;
  background: var(--volume-fill);
  border: none;
  cursor: pointer;
}
.volume-slider:disabled::-webkit-slider-thumb,
.volume-slider:disabled::-moz-range-thumb {
  cursor: not-allowed;
}
</style>
