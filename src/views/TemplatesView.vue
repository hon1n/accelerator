<script setup lang="ts">
import { ref, computed } from "vue";
import { Plus, Save, Trash2, ArrowUp, ArrowDown } from "@lucide/vue";

import Select from "../components/ui/Select.vue";
import Header from "../components/layout/Header.vue";
import Input from "../components/ui/Input.vue";

interface Section {
  id: number;
  title: string;
  prompt: string;
}

interface Template {
  id: number;
  name: string;
  description: string;
  details: string;
  style: string;
  sections: Section[];
}

const templates = ref<Template[]>([
  {
    id: 1,
    name: "Шаблон для интервью",
    description: "Сборник вопросов для HR",
    details: "Подробно",
    style: "Официальный",
    sections: [],
  },
  {
    id: 2,
    name: "Еженедельный отчет",
    description: "Сводка задач за неделю",
    details: "Кратко",
    style: "Технический",
    sections: [],
  },
]);

const detailsOptions = ["Оптимально", "Кратко", "Подробно"];
const styleOptions = ["Разговорный", "Официальный", "Технический"];

const activeTemplateId = ref(1);

const currentTemplate = computed(() => {
  return templates.value.find((t) => t.id === activeTemplateId.value) || templates.value[0];
});

const addSection = () => {
  const newId = currentTemplate.value.sections.length > 0 ? Math.max(...currentTemplate.value.sections.map((s) => s.id)) + 1 : 1;
  currentTemplate.value.sections.push({ id: newId, title: "", prompt: "" });
};

const removeSection = (index: number) => {
  currentTemplate.value.sections.splice(index, 1);
};

const moveSectionUp = (index: number) => {
  if (index > 0) {
    const temp = currentTemplate.value.sections[index];
    currentTemplate.value.sections[index] = currentTemplate.value.sections[index - 1];
    currentTemplate.value.sections[index - 1] = temp;
  }
};

const moveSectionDown = (index: number) => {
  if (index < currentTemplate.value.sections.length - 1) {
    const temp = currentTemplate.value.sections[index];
    currentTemplate.value.sections[index] = currentTemplate.value.sections[index + 1];
    currentTemplate.value.sections[index + 1] = temp;
  }
};

const generatedPrompt = computed(() => {
  let prompt = `Ты — ассистент, который делает summary встречи по транскрипту.\n\n`;
  prompt += `Стиль: ${currentTemplate.value.style}.\n`;
  prompt += `Детализация: ${currentTemplate.value.details}.\n`;
  prompt += `Форматирование:\n- Используй маркированные списки, где уместно.\n- Выделяй имена участников жирным.\n\n`;

  if (currentTemplate.value.sections.length > 0) {
    prompt += `Секции для анализа:\n`;
    currentTemplate.value.sections.forEach((sec) => {
      if (sec.title || sec.prompt) {
        prompt += `[${sec.title || "Без названия"}]\n${sec.prompt || "..."}\n\n`;
      }
    });
  }

  return prompt.trim();
});
</script>

<template>
  <div class="dark:bg-dark flex h-screen w-full flex-col overflow-hidden bg-white text-gray-900 transition-colors duration-300 dark:text-gray-200">
    <Header />

    <main class="mx-auto flex min-h-0 w-full max-w-450 flex-1 flex-col gap-6 px-4 py-6">
      <div class="flex shrink-0 items-center justify-between">
        <div>
          <p class="mb-1 text-sm text-[#A8A9AC] dark:text-gray-400">Шаблоны</p>
          <h1 class="text-2xl font-bold text-black transition-colors dark:text-white">Конструктор шаблонов</h1>
        </div>
        <button class="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
          <Plus class="h-4 w-4" />
          Новый шаблон
        </button>
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
        <div
          class="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors lg:col-span-4 xl:col-span-3 dark:border-[#FFFFFF10] dark:bg-white/5"
        >
          <div class="shrink-0 border-b border-gray-100 p-6 transition-colors dark:border-[#FFFFFF10]">
            <h2 class="text-sm font-semibold text-gray-900 transition-colors dark:text-white">Список</h2>
          </div>

          <div class="custom-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto p-4">
            <button
              v-for="template in templates"
              :key="template.id"
              @click="activeTemplateId = template.id"
              :class="[
                'flex shrink-0 cursor-pointer flex-col rounded-xl p-4 text-left transition-colors',
                activeTemplateId === template.id ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5',
              ]"
            >
              <h3 class="text-[15px] font-semibold text-gray-900 transition-colors dark:text-white">{{ template.name }}</h3>
              <p class="mt-1 text-sm text-gray-500 transition-colors dark:text-gray-400">{{ template.description }}</p>
            </button>
          </div>
        </div>

        <div
          class="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors lg:col-span-8 xl:col-span-9 dark:border-[#FFFFFF10] dark:bg-white/5"
        >
          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 p-6 transition-colors dark:border-[#FFFFFF10]">
            <div>
              <p class="text-xs text-gray-500 transition-colors dark:text-gray-400">Редактирование</p>
              <h2 class="mt-1 text-xl font-bold text-black transition-colors dark:text-white">{{ currentTemplate.name || "Без названия" }}</h2>
            </div>
            <div class="flex items-center gap-3">
              <button class="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                <Save class="h-4 w-4" />
                Сохранить
              </button>
              <button
                class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-red-600 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <Trash2 class="h-4 w-4" />
                Удалить
              </button>
            </div>
          </div>

          <div class="custom-scrollbar flex flex-1 flex-col gap-8 overflow-y-auto p-6">
            <div class="grid shrink-0 grid-cols-1 gap-6 md:grid-cols-2">
              <Input v-model="currentTemplate.name" label="Название" type="text" placeholder="Введите название" />
              <Input v-model="currentTemplate.description" label="Введите описание" type="text" placeholder="Введите название" />

              <Select v-model="currentTemplate.details" label="Детализация" :options="detailsOptions" />

              <Select v-model="currentTemplate.style" label="Стиль" :options="styleOptions" />
            </div>

            <div class="h-px w-full shrink-0 bg-gray-100 transition-colors dark:bg-[#FFFFFF10]"></div>

            <div class="flex shrink-0 flex-col gap-6">
              <div class="flex items-center justify-between">
                <h3 class="text-base font-semibold text-gray-900 transition-colors dark:text-white">Секции</h3>
                <button
                  @click="addSection"
                  class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Plus class="h-4 w-4 text-gray-400" />
                  Добавить секцию
                </button>
              </div>

              <div class="flex flex-col gap-4">
                <div
                  v-for="(section, index) in currentTemplate.sections"
                  :key="section.id"
                  class="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 transition-colors dark:border-[#FFFFFF10] dark:bg-black/10"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 transition-colors dark:bg-white/10 dark:text-gray-300"
                    >
                      {{ index + 1 }}
                    </div>
                    <input
                      type="text"
                      v-model="section.title"
                      placeholder="Название секции"
                      class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-[#FFFFFF10] dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
                    />
                    <div class="flex shrink-0 items-center gap-1">
                      <button
                        @click="moveSectionDown(index)"
                        :disabled="index === currentTemplate.sections.length - 1"
                        class="flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 dark:border-[#FFFFFF10] dark:hover:bg-white/10 dark:hover:text-gray-200"
                      >
                        <ArrowDown class="h-4 w-4" />
                      </button>
                      <button
                        @click="moveSectionUp(index)"
                        :disabled="index === 0"
                        class="flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 dark:border-[#FFFFFF10] dark:hover:bg-white/10 dark:hover:text-gray-200"
                      >
                        <ArrowUp class="h-4 w-4" />
                      </button>
                      <button
                        @click="removeSection(index)"
                        class="ml-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-gray-200 text-red-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-[#FFFFFF10] dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    v-model="section.prompt"
                    rows="3"
                    placeholder="Какой результат хотите получить от ИИ"
                    class="w-full resize-none rounded-lg border border-gray-200 bg-white p-4 text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-[#FFFFFF10] dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
                  ></textarea>
                </div>

                <div v-if="currentTemplate.sections.length === 0" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Секции пока не добавлены. Нажмите «Добавить секцию», чтобы начать.
                </div>
              </div>
            </div>

            <div class="mt-4 flex shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 transition-colors dark:border-[#FFFFFF10]">
              <div class="border-b border-gray-100 bg-gray-50 px-6 py-4 transition-colors dark:border-[#FFFFFF10] dark:bg-white/5">
                <h3 class="text-sm font-semibold text-gray-900 transition-colors dark:text-white">Получившийся промпт</h3>
              </div>
              <div class="bg-white p-6 transition-colors dark:bg-black/10">
                <pre class="font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-700 transition-colors dark:text-gray-300">{{ generatedPrompt }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
}
</style>
