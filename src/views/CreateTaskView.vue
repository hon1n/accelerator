<script setup lang="ts">
import { ref, nextTick } from "vue";
import { Plus } from "@lucide/vue";

import Header from "../components/layout/Header.vue";
import Select from "../components/ui/Select.vue";
import Input from "../components/ui/Input.vue";

const form = ref({
  group: "Менеджеры",
  date: "18.10.2026",
  title: "",
  description: "",
  template: "Шаблон для интервью",
  transcriptionModel: "Whisper V4",
  summarizationModel: "Qwen3",
  file: null as File | null,
});

const groups = ["Менеджеры", "Разработчики", "Дизайнеры", "Маркетинг"];
const templates = ["Шаблон для интервью", "Еженедельный отчет"];
const transcriptionModels = ["Whisper V4", "Whisper V3", "Google Speech-to-Text"];
const summarizationModels = ["Qwen3", "GPT-4o", "Claude 3.5 Sonnet"];

const fileInputRef = ref<HTMLInputElement | null>(null);
const fileName = ref("Не выбран ни один файл");

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    form.value.file = target.files[0];
    fileName.value = target.files[0].name;
  } else {
    form.value.file = null;
    fileName.value = "Не выбран ни один файл";
  }
};

const onDateInput = (e: Event) => {
  const el = e.target as HTMLInputElement;
  const val = el.value;

  const cursor = el.selectionStart || 0;


  const clean = val.replace(/\D/g, "").slice(0, 8);


  let formatted = "";
  if (clean.length > 4) {
    formatted = `${clean.slice(0, 2)}.${clean.slice(2, 4)}.${clean.slice(4)}`;
  } else if (clean.length > 2) {
    formatted = `${clean.slice(0, 2)}.${clean.slice(2)}`;
  } else {
    formatted = clean;
  }

  const cleanBeforeCursor = val.slice(0, cursor).replace(/\D/g, "");
  let newCursor = cleanBeforeCursor.length;

  if (newCursor > 2) newCursor++;
  if (newCursor > 4) newCursor++;

  form.value.date = formatted;
  el.value = formatted;

  nextTick(() => {
    el.setSelectionRange(newCursor, newCursor);
  });
};
</script>

<template>
  <div class="dark:bg-dark flex h-screen w-full flex-col overflow-hidden bg-white text-gray-900 transition-colors duration-300 dark:text-gray-200">
    <Header />

    <main class="mx-auto flex min-h-0 w-full max-w-300 flex-1 flex-col gap-6 px-4 py-6">
      <div class="flex shrink-0 items-center justify-between">
        <div>
          <p class="mb-1 text-sm text-[#A8A9AC] dark:text-gray-400">Создание записи</p>
          <h1 class="text-2xl font-bold text-black transition-colors dark:text-white">Создание записи</h1>
        </div>
      </div>

      <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors dark:border-[#FFFFFF10] dark:bg-white/5">
        <div class="shrink-0 border-b border-gray-100 p-6 transition-colors dark:border-[#FFFFFF10]">
          <h2 class="text-sm font-semibold text-gray-900 transition-colors dark:text-white">Форма</h2>
        </div>

        <div class="scrollbar-hide flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Select v-model="form.group" label="Группа" :options="groups" />
            <Input v-model="form.date" label="Дата встречи" @input="onDateInput" type="text" placeholder="ДД.ММ.ГГГГ" />
          </div>

          <Input v-model="form.title" label="Название записи" type="text" placeholder="Например: 'Совещание №1'" />

          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-700 transition-colors dark:text-gray-300">Описание</label>
            <textarea
              v-model="form.description"
              rows="4"
              placeholder='Например: "продуктовое совещание"'
              class="w-full resize-none rounded-lg border border-gray-200 bg-white p-4 text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-[#FFFFFF10] dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
            ></textarea>
          </div>

          <div class="w-full shrink-0">
            <Select v-model="form.template" label="Шаблон конспекта" :options="templates" />
          </div>

          <div class="grid shrink-0 grid-cols-1 gap-6 md:grid-cols-2">
            <Select v-model="form.transcriptionModel" label="Модель для транскрибации" :options="transcriptionModels" />
            <Select v-model="form.summarizationModel" label="Модель для конспектирования" :options="summarizationModels" />
          </div>

          <div class="flex shrink-0 flex-col gap-2">
            <label class="text-sm font-medium text-gray-700 transition-colors dark:text-gray-300">Аудиофайл</label>
            <input type="file" class="hidden" ref="fileInputRef" @change="handleFileChange" accept="audio/*,video/*" />
            <div
              class="flex w-full items-center overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 dark:border-[#FFFFFF10] dark:bg-black/20"
            >
              <button
                type="button"
                @click="triggerFileInput"
                class="border-r border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-[#FFFFFF10] dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
              >
                Выбор файла
              </button>
              <span class="truncate px-4 text-sm" :class="form.file ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'">
                {{ fileName }}
              </span>
            </div>
          </div>
        </div>

        <div class="shrink-0 border-t border-gray-100 bg-white p-6 transition-colors dark:border-[#FFFFFF10] dark:bg-transparent">
          <button type="button" class="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            <Plus class="h-4 w-4" />
            Создать запись
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
