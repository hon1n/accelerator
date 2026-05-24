<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Upload, ArrowLeft } from "@lucide/vue";
import Header from "../components/layout/Header.vue";
import Card from "../components/ui/Card.vue";
import Select from "../components/ui/Select.vue";
import Input from "../components/ui/Input.vue";
import Textarea from "../components/ui/Textarea.vue";
import Button from "../components/ui/Button.vue";
import { extractApiErrorMessage } from "../api";
import { formatAdditionalPrompt } from "../api/patterns.utils";
import { useGroupsStore } from "../stores/groups";
import { usePatternsStore } from "../stores/patterns";
import { useTasksStore } from "../stores/tasks";
import { fieldControlClass, fieldControlSizeClass, fieldLabelClass } from "../components/ui/fieldStyles";

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
  asrModel: "Whisper V4",
  llmModel: "Qwen3",
  tokens: "4000",
  file: null as File | null,
});

const error = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const groupOptions = computed(() => {
  return groupsStore.groups.map((g) => ({
    value: g.group_id,
    label: g.name,
  }));
});

const patternOptions = computed(() => {
  if (!form.value.groupId) return [];
  
  const patterns = [
    ...patternsStore.groupGlobalPatterns,
    ...patternsStore.groupLocalPatterns,
  ];
  
  return patterns.map((p) => ({
    value: p.pattern_id,
    label: p.name,
  }));
});

const asrModelOptions = [
  { value: "Whisper V4", label: "Whisper V4" },
  { value: "Whisper V3", label: "Whisper V3" },
  { value: "Google Speech-to-Text", label: "Google Speech-to-Text" },
];

const llmModelOptions = [
  { value: "Qwen3", label: "Qwen3" },
  { value: "GPT-4o", label: "GPT-4o" },
  { value: "Claude 3.5 Sonnet", label: "Claude 3.5 Sonnet" },
];

const tokensOptions = [
  { value: "2000", label: "2000" },
  { value: "4000", label: "4000" },
  { value: "8000", label: "8000" },
  { value: "16000", label: "16000" },
];

const fileName = computed(() => {
  return form.value.file ? form.value.file.name : "Не выбран ни один файл";
});

const isFormValid = computed(() => {
  return (
    form.value.groupId &&
    form.value.taskName.trim() &&
    form.value.patternId &&
    form.value.asrModel &&
    form.value.llmModel &&
    form.value.tokens &&
    form.value.file
  );
});

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    form.value.file = target.files[0];
  } else {
    form.value.file = null;
  }
};

const handleGroupChange = async (groupId: string) => {
  form.value.groupId = groupId;
  form.value.patternId = "";
  
  if (groupId) {
    await patternsStore.fetchGroupPatterns(groupId);
  }
};

const handleSubmit = async () => {
  if (!isFormValid.value) return;

  error.value = null;

  try {
    const selectedPattern = [
      ...patternsStore.groupGlobalPatterns,
      ...patternsStore.groupLocalPatterns,
    ].find((p) => p.pattern_id === form.value.patternId);

    if (!selectedPattern) {
      throw new Error("Шаблон не найден");
    }

    const meetingDate = form.value.meetingDate
      ? new Date(`${form.value.meetingDate}T12:00:00`).toISOString()
      : new Date().toISOString();

    const additionalRaw = formatAdditionalPrompt(selectedPattern.additional_prompt);
    const additional_prompt = additionalRaw.trim() ? additionalRaw : "{}";

    const response = await tasksStore.uploadTask(
      form.value.file!,
      {
        task_name: form.value.taskName.trim(),
        description: form.value.description.trim(),
        meeting_date: meetingDate,
        summary_prompt: selectedPattern.summary_prompt,
        additional_prompt,
        asr_model: form.value.asrModel,
        llm_model: form.value.llmModel,
        tokens: form.value.tokens,
      },
      form.value.groupId,
    );

    await router.push({
      name: "RecordProcessingDetails",
      params: { id: response.task_id },
    });
  } catch (err: unknown) {
    error.value = extractApiErrorMessage(err, "Не удалось создать запись");
  }
};

onMounted(async () => {
  await groupsStore.fetchGroups();
  
  if (groupsStore.groups.length > 0) {
    const firstGroupId = groupsStore.groups[0].group_id;
    form.value.groupId = firstGroupId;
    await patternsStore.fetchGroupPatterns(firstGroupId);
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-dark">
    <Header />

    <main class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Back Button -->
      <button
        type="button"
        class="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        @click="router.push({ name: 'Dashboard' })"
      >
        <ArrowLeft :size="16" />
        Главная
      </button>

      <!-- Page Header -->
      <div class="mb-6">
        <p class="text-sm text-gray-500 dark:text-gray-400">Создание записи</p>
        <h1 class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          Создание записи
        </h1>
      </div>

      <!-- Form -->
      <Card padding="lg">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Error Message -->
          <div
            v-if="error"
            class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          >
            {{ error }}
          </div>

          <!-- Group and Date -->
          <div class="grid gap-6 sm:grid-cols-2">
            <Select
              label="Группа"
              :model-value="form.groupId"
              :options="groupOptions"
              @update:model-value="handleGroupChange"
            />

            <Input v-model="form.meetingDate" label="Дата встречи" type="date" />
          </div>

          <Input
            v-model="form.taskName"
            label="Название записи"
            placeholder='Например: "Совещание №1"'
          />

          <Textarea
            v-model="form.description"
            label="Описание"
            :rows="4"
            placeholder='Например: "продуктовое совещание"'
          />

          <Select
            v-model="form.patternId"
            label="Шаблон конспекта"
            :options="patternOptions"
            :disabled="!form.groupId || patternOptions.length === 0"
          />

          <!-- Models -->
          <div class="grid gap-6 sm:grid-cols-2">
            <Select
              v-model="form.asrModel"
              label="Модель для транскрибации"
              :options="asrModelOptions"
            />

            <Select
              v-model="form.llmModel"
              label="Модель для конспектирования"
              :options="llmModelOptions"
            />
          </div>

          <Select v-model="form.tokens" label="Количество токенов" :options="tokensOptions" />

          <div class="flex w-full flex-col gap-1.5">
            <label :class="fieldLabelClass">Аудиофайл</label>
            <input
              ref="fileInputRef"
              type="file"
              class="hidden"
              accept="audio/*,video/*"
              @change="handleFileChange"
            />
            <div
              :class="[
                fieldControlClass(),
                fieldControlSizeClass,
                'flex items-center overflow-hidden p-0',
              ]"
            >
              <button
                type="button"
                class="h-full shrink-0 border-r border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-200 dark:hover:bg-dark-card"
                @click="triggerFileInput"
              >
                Выбор файла
              </button>
              <span
                class="flex-1 truncate px-4 text-sm"
                :class="
                  form.file
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                "
              >
                {{ fileName }}
              </span>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              @click="router.push({ name: 'Dashboard' })"
            >
              Отмена
            </Button>
            <Button type="submit" :disabled="!isFormValid" :is-loading="tasksStore.isUploading">
              <Upload :size="18" />
              Создать запись
            </Button>
          </div>
        </form>
      </Card>
    </main>
  </div>
</template>
