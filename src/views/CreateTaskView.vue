<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, Upload, FileAudio, Music, X, Info, FileText } from "@lucide/vue";
import Header from "../components/layout/Header.vue";
import Card from "../components/ui/Card.vue";
import Select from "../components/ui/Select.vue";
import Input from "../components/ui/Input.vue";
import DatePicker from "../components/ui/DatePicker.vue";
import Textarea from "../components/ui/Textarea.vue";
import Button from "../components/ui/Button.vue";
import FormError from "../components/ui/FormError.vue";
import { useGroupsStore } from "../stores/groups";
import { usePatternsStore } from "../stores/patterns";
import { useTasksStore, UPLOADING_TASK_ID } from "../stores/tasks";
import { useAutoRefresh } from "../composables/useAutoRefresh";

const router = useRouter();
const groupsStore = useGroupsStore();
const patternsStore = usePatternsStore();
const tasksStore = useTasksStore();

const form = ref({
  groupId: "",
  meetingDate: "",
  taskName: "",
  description: "",
  patternId: "",
  file: null as File | null,
});

const error = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const groupOptions = computed(() =>
  groupsStore.groups.map((g) => ({ value: g.group_id, label: g.name })),
);

const patternOptions = computed(() => {
  if (!form.value.groupId) return [];
  const patterns = [
    ...patternsStore.groupGlobalPatterns,
    ...patternsStore.groupLocalPatterns,
  ];
  return patterns.map((p) => ({ value: p.pattern_id, label: p.name }));
});

const fileSizeLabel = computed(() => {
  const file = form.value.file;
  if (!file) return "";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let size = file.size;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
});

const isFormValid = computed(
  () =>
    !!form.value.groupId &&
    form.value.taskName.trim().length > 0 &&
    form.value.description.trim().length > 0 &&
    !!form.value.meetingDate &&
    !!form.value.patternId &&
    !!form.value.file,
);

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const setFile = (file: File | null) => {
  form.value.file = file;
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setFile(target.files && target.files.length > 0 ? target.files[0] : null);
};

const removeFile = () => {
  form.value.file = null;
  if (fileInputRef.value) fileInputRef.value.value = "";
};

const handleDragOver = () => {
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  const dropped = event.dataTransfer?.files;
  if (!dropped || dropped.length === 0) return;
  const file = dropped[0];
  if (file.type.startsWith("audio/") || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(file.name)) {
    setFile(file);
  }
};

const handleGroupChange = async (groupId: string) => {
  form.value.groupId = groupId;
  form.value.patternId = "";
  if (groupId) {
    try {
      await patternsStore.fetchGroupPatterns(groupId);
    } catch {
      // ошибка отобразится через store
    }
  }
};

const handleSubmit = async () => {
  if (!isFormValid.value) return;
  error.value = null;

  const meetingDate = new Date(`${form.value.meetingDate}T12:00:00`).toISOString();

  // Запускаем передачу файла в фоне и сразу уходим на экран обработки —
  // реальный task_id придёт позже, экран подхватит его сам.
  tasksStore.startUpload(form.value.groupId, form.value.file!, {
    task_name: form.value.taskName.trim(),
    description: form.value.description.trim(),
    meeting_date: meetingDate,
    pattern_id: form.value.patternId,
  });

  await router.push({
    name: "RecordProcessingDetails",
    params: { id: UPLOADING_TASK_ID },
  });
};

onMounted(async () => {
  try {
    await groupsStore.fetchGroups({ force: true });
  } catch {
    return;
  }

  const initial = groupsStore.activeGroupId ?? groupsStore.groups[0]?.group_id ?? "";
  if (initial) {
    form.value.groupId = initial;
    try {
      await patternsStore.fetchGroupPatterns(initial, { force: true });
    } catch {
      // ok
    }
  }
});

useAutoRefresh(async () => {
  try {
    await groupsStore.fetchGroups({ force: true });
    if (form.value.groupId) {
      await patternsStore.fetchGroupPatterns(form.value.groupId, { force: true });
    }
  } catch {
    // ok
  }
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-gray-50 dark:bg-dark">
    <Header max-width="max-w-[1800px]" />

    <main
      class="mx-auto flex w-full min-h-0 max-w-[1800px] flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6 lg:px-8"
    >
      <button
        type="button"
        class="mb-3 flex shrink-0 cursor-pointer items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        @click="router.push({ name: 'Dashboard' })"
      >
        <ArrowLeft :size="16" />
        Главная
      </button>

      <!-- Заголовок страницы -->
      <div class="mb-5 flex shrink-0 items-center gap-4">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white dark:bg-white dark:text-dark"
        >
          <FileAudio :size="20" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Создание записи</h1>
          <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Загрузите аудио и заполните детали — мы подготовим конспект и стенограмму.
          </p>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-5">
        <FormError :message="error" />

        <div class="grid items-stretch gap-5 lg:grid-cols-2">
          <!-- Левая панель: данные записи -->
          <Card padding="lg" class="flex flex-col">
            <div class="mb-5 flex shrink-0 items-center gap-2">
              <FileText :size="16" class="text-blue-600 dark:text-white" />
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                Основная информация
              </h2>
            </div>

            <div class="flex flex-col gap-5">
              <div class="grid gap-5 sm:grid-cols-2">
                <Select
                  label="Группа"
                  :model-value="form.groupId"
                  :options="groupOptions"
                  placeholder="Выберите группу"
                  @update:model-value="handleGroupChange"
                />

                <DatePicker v-model="form.meetingDate" label="Дата встречи" />
              </div>

              <div class="grid gap-5 sm:grid-cols-2">
                <Input
                  v-model="form.taskName"
                  label="Название записи"
                  placeholder='Например: "Совещание №1"'
                />

                <Select
                  v-model="form.patternId"
                  label="Шаблон конспекта"
                  :options="patternOptions"
                  :disabled="!form.groupId || patternOptions.length === 0"
                  placeholder="Выберите шаблон"
                />
              </div>

              <Textarea
                v-model="form.description"
                label="Описание"
                :rows="4"
                placeholder='Например: "продуктовое совещание"'
              />
            </div>
          </Card>

          <!-- Правая панель: аудиофайл -->
          <Card padding="lg" class="flex flex-col">
            <div class="mb-5 flex shrink-0 items-center gap-2">
              <Music :size="16" class="text-blue-600 dark:text-white" />
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Аудиофайл</h2>
            </div>

            <input
              ref="fileInputRef"
              type="file"
              class="hidden"
              accept="audio/*"
              @change="handleFileChange"
            />

            <div class="flex min-h-0 flex-1 flex-col">
              <!-- Превью выбранного файла -->
              <div v-if="form.file" class="flex flex-1 items-center justify-center">
                <div class="w-full max-w-md">
                  <div
                    class="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-border dark:bg-dark-elevated"
                  >
                    <div
                      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white dark:bg-white dark:text-dark"
                    >
                      <FileAudio :size="20" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {{ form.file.name }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{{ fileSizeLabel }}</p>
                    </div>
                    <div class="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        class="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/10"
                        @click="triggerFileInput"
                      >
                        Заменить
                      </button>
                      <button
                        type="button"
                        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        title="Удалить файл"
                        @click="removeFile"
                      >
                        <X :size="16" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Зона загрузки (drag & drop) -->
              <button
                v-else
                type="button"
                :class="[
                  'flex min-h-0 w-full flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:border-white dark:bg-white/5'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 dark:border-dark-border dark:hover:border-gray-500 dark:hover:bg-white/5',
                ]"
                @click="triggerFileInput"
                @dragover.prevent="handleDragOver"
                @dragleave.prevent="handleDragLeave"
                @drop.prevent="handleDrop"
              >
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300"
                >
                  <Upload :size="22" />
                </div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Перетащите файл сюда или
                  <span class="text-blue-600 dark:text-white">выберите на компьютере</span>
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500">MP3, WAV, OGG, AAC, FLAC</p>
              </button>

              <div
                class="mt-4 flex shrink-0 items-start gap-2 rounded-lg bg-blue-50/60 p-3 text-xs text-gray-600 dark:bg-white/5 dark:text-gray-400"
              >
                <Info :size="14" class="mt-0.5 shrink-0 text-blue-500 dark:text-gray-400" />
                <span>
                  Обработка может занять некоторое время в зависимости от длительности записи.
                </span>
              </div>
            </div>
          </Card>
        </div>

        <!-- Действия -->
        <div class="flex shrink-0 flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="submit" :disabled="!isFormValid" :is-loading="tasksStore.isUploading">
            <Upload :size="18" />
            Создать запись
          </Button>
        </div>
      </form>
    </main>
  </div>
</template>
