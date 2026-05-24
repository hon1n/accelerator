<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Play, Pause, Download, ArrowLeft } from "@lucide/vue";
import Header from "../components/layout/Header.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Spinner from "../components/ui/Spinner.vue";
import { useTasksStore } from "../stores/tasks";
import { downloadTextFile } from "../utils/download";
import type { TaskDetail } from "../utils/demoTasks";

const route = useRoute();
const router = useRouter();
const tasksStore = useTasksStore();

const task = ref<TaskDetail | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const playbackSpeed = ref(1);

const speedOptions = [
  { value: 0.5, label: "0.5x" },
  { value: 1, label: "1x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" },
];

const formattedCurrentTime = computed(() => formatSeconds(Math.floor(currentTime.value)));
const formattedDuration = computed(() => formatSeconds(task.value?.duration_seconds ?? 0));

const speakerCount = computed(() => {
  const speakers = new Set((task.value?.transcript ?? []).map((e) => e.speaker));
  return speakers.size || 0;
});

function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const togglePlay = () => {
  isPlaying.value = !isPlaying.value;
};

const handleDownloadSummary = () => {
  if (!task.value?.summary) return;
  const safeName = (task.value.task_name ?? "konspekt").replace(/[<>:"/\\|?*]/g, "").trim();
  downloadTextFile(`${safeName || "konspekt"}.md`, task.value.summary, "text/markdown;charset=utf-8");
};

const handleDownloadTranscript = () => {
  if (!task.value?.transcript?.length) return;
  const text = task.value.transcript
    .map((e) => `[${e.timestamp}] ${e.speaker}\n${e.text}`)
    .join("\n\n");
  const safeName = (task.value.task_name ?? "stenogramma").replace(/[<>:"/\\|?*]/g, "").trim();
  downloadTextFile(`${safeName || "stenogramma"}.txt`, text);
};

onMounted(() => {
  const detail = tasksStore.getTaskDetail(route.params.id as string);

  if (!detail) {
    error.value = "Р—Р°РїРёСЃСЊ РЅРµ РЅР°Р№РґРµРЅР°";
    isLoading.value = false;
    return;
  }

  if (
    detail.status === "processing_transcribe" ||
    detail.status === "processing_summary"
  ) {
    void router.replace({ name: "RecordProcessingDetails", params: { id: detail.task_id } });
    return;
  }

  if (detail.status === "error") {
    error.value = "РћР±СЂР°Р±РѕС‚РєР° Р·Р°РІРµСЂС€РёР»Р°СЃСЊ СЃ РѕС€РёР±РєРѕР№";
    isLoading.value = false;
    return;
  }

  task.value = detail;
  isLoading.value = false;
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-dark">
    <Header />

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div v-if="isLoading" class="flex items-center justify-center py-12">
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
          class="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          @click="router.push({ name: 'Dashboard' })"
        >
          <ArrowLeft :size="16" />
          Главная
        </button>

        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ task.task_name }}</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ task.meeting_date }} вЂў {{ Math.round((task.duration_seconds ?? 0) / 60) }} РјРёРЅСѓС‚
            <span v-if="speakerCount"> вЂў {{ speakerCount }} СЃРїРёРєРµСЂРѕРІ</span>
          </p>
        </div>

        <Card padding="md" class="mb-6">
          <div class="flex items-center gap-4">
            <button
              type="button"
              class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 dark:bg-white dark:text-dark dark:hover:bg-gray-200"
              @click="togglePlay"
            >
              <Play v-if="!isPlaying" :size="20" />
              <Pause v-else :size="20" />
            </button>

            <div class="flex-1">
              <div class="mb-2 flex items-center justify-between text-sm">
                <span class="text-gray-900 dark:text-white">{{ formattedCurrentTime }}</span>
                <span class="text-gray-500 dark:text-gray-400">{{ formattedDuration }}</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-elevated">
                <div
                  class="h-full bg-blue-600 transition-all dark:bg-white"
                  :style="{
                    width: `${task.duration_seconds ? (currentTime / task.duration_seconds) * 100 : 0}%`,
                  }"
                />
              </div>
            </div>

            <select
              v-model="playbackSpeed"
              class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-dark-border dark:bg-dark-card dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
            >
              <option v-for="option in speedOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </Card>

        <div class="grid gap-6 lg:grid-cols-2">
          <Card padding="lg" class="h-fit">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">РљРѕРЅСЃРїРµРєС‚</h2>
              <Button
                variant="outline"
                size="sm"
                :disabled="!task.summary"
                @click="handleDownloadSummary"
              >
                <Download :size="16" />
                РЎРєР°С‡Р°С‚СЊ
              </Button>
            </div>

            <div
              v-if="task.summary"
              class="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-gray-700 dark:prose-p:text-gray-300"
              v-html="task.summary.replace(/\n/g, '<br>')"
            />
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              РљРѕРЅСЃРїРµРєС‚ РїРѕСЏРІРёС‚СЃСЏ РїРѕСЃР»Рµ Р·Р°РІРµСЂС€РµРЅРёСЏ РѕР±СЂР°Р±РѕС‚РєРё.
            </p>
          </Card>

          <Card padding="lg" class="h-fit">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">РЎС‚РµРЅРѕРіСЂР°РјРјР°</h2>
              <Button
                variant="outline"
                size="sm"
                :disabled="!task.transcript?.length"
                @click="handleDownloadTranscript"
              >
                <Download :size="16" />
                РЎРєР°С‡Р°С‚СЊ
              </Button>
            </div>

            <div v-if="task.transcript?.length" class="space-y-4">
              <div
                v-for="(entry, index) in task.transcript"
                :key="index"
                class="rounded-lg bg-gray-50 p-4 dark:bg-dark-elevated"
              >
                <div class="mb-2 flex items-center gap-2">
                  <span
                    class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-white/10 dark:text-gray-300"
                  >
                    {{ entry.speaker }}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{ entry.timestamp }}</span>
                </div>
                <p class="text-sm text-gray-700 dark:text-gray-300">{{ entry.text }}</p>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              РЎС‚РµРЅРѕРіСЂР°РјРјР° РїРѕСЏРІРёС‚СЃСЏ РїРѕСЃР»Рµ Р·Р°РІРµСЂС€РµРЅРёСЏ РѕР±СЂР°Р±РѕС‚РєРё.
            </p>
          </Card>
        </div>
      </template>
    </main>
  </div>
</template>
