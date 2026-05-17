<script setup lang="ts">
import { ref } from "vue";

import Header from "../components/layout/Header.vue";

const taskData = ref({
  title: "Квартальное планирование: Цели и OKR отдела продаж",
  date: "20 апр, 2026",
  duration_minutes: 44,
  speakers_count: 10,
  tags: ["маркетинг", "it-сектор"],
  template_name: "Базовый протокол совещания",
});

const transcript = ref([
  {
    speaker: "Спикер №1",
    time: "00:00:00",
    text: "Так, коллеги, добрый день всем. Начинаем наш квартальный синхрон. Сегодня обсуждаем планирование на третий квартал, наши цели и OKR. Сначала кратко по итогам второго. Мы закрыли его на девяносто два процента... ну, чуть-чуть не дотянули до таргета. Э-э, Дмитрий, выведи, пожалуйста, данные по воронке на экран.",
  },
  {
    speaker: "Спикер №2",
    time: "00:01:57",
    text: "Да, вывожу. Смотрите, основная просадка у нас случилась в августе по Enterprise сегменту. Цикл сделки увеличился в среднем на 14 дней из-за новых требований безопасности на стороне клиентов. Мы потеряли две крупные сделки на этапе согласования договоров.",
  },
  {
    speaker: "Спикер №3",
    time: "00:02:15",
    text: "Я бы добавила, что маркетинговые лиды в этом квартале были холоднее обычного. Отдел продаж тратил много времени на первичную квалификацию. Нам нужно пересмотреть скоринг лидов совместно с маркетингом.",
  },
  {
    speaker: "Спикер №1",
    time: "00:03:02",
    text: "Согласен. Давайте зафиксируем это как одну из задач. Теперь переходим к целям на Q3. Наша главная задача — сократить цикл сделки и повысить конверсию из SQL в успешную оплату минимум на 5 процентов.",
  },
]);

const getSpeakerColor = (speakerName: string) => {
  if (speakerName.includes("1")) return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
  if (speakerName.includes("2")) return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300";
  if (speakerName.includes("3")) return "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300";
  if (speakerName.includes("4")) return "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300";
  return "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300";
};
</script>

<template>
  <div class="dark:bg-dark flex h-screen w-full flex-col overflow-hidden bg-white text-gray-900 transition-colors duration-300 dark:text-gray-200">
    <Header />

    <main class="mx-auto flex min-h-0 w-full max-w-450 flex-1 flex-col gap-6 px-4 py-6">
      <div
        class="dark:bg-dark flex shrink-0 flex-col justify-between gap-6 rounded-2xl border border-gray-200 bg-white p-6 transition-colors xl:flex-row xl:items-center dark:border-[#FFFFFF10]"
      >
        <div>
          <h1 class="mb-2 text-2xl font-semibold text-black transition-colors dark:text-white">{{ taskData.title }}</h1>
          <div class="flex items-center gap-3 text-sm text-[#A8A9AC] dark:text-gray-400">
            <span>{{ taskData.date }}</span>
            <span>•</span>
            <span>{{ taskData.duration_minutes }} минуты</span>
            <span>•</span>
            <span>{{ taskData.speakers_count }} спикеров</span>

            <div class="ml-2 flex items-center gap-2">
              <span
                v-for="tag in taskData.tags"
                :key="tag"
                class="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 transition-colors dark:bg-white/10 dark:text-gray-300"
              >
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex min-w-75 items-center gap-4 xl:w-100">
          <button
            class="text-primary dark:bg-primary/20 dark:hover:bg-primary/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 transition-colors hover:bg-blue-100"
          >
            <svg class="ml-1 h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>

          <div class="flex flex-1 items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>10:22</span>
            <div class="relative h-1.5 flex-1 cursor-pointer rounded-full bg-gray-200 dark:bg-gray-700">
              <div class="bg-primary absolute top-0 left-0 h-full w-[25%] rounded-full"></div>
              <div class="bg-primary absolute top-1/2 left-[25%] h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white shadow-sm dark:border-gray-800"></div>
            </div>
            <span>43:57</span>
          </div>
        </div>
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="dark:bg-dark flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors dark:border-[#FFFFFF10]">
          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 py-4 transition-colors dark:border-[#FFFFFF10] dark:bg-transparent">
            <div>
              <h2 class="text-lg font-semibold text-black transition-colors dark:text-white">Конспект</h2>
              <p class="text-sm text-[#A8A9AC] dark:text-gray-400">Шаблон: {{ taskData.template_name }}</p>
            </div>
            <button
              class="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <svg class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Скачать
            </button>
          </div>
          <div class="custom-scrollbar prose prose-sm max-w-none flex-1 overflow-y-auto p-6 leading-relaxed text-gray-800 dark:text-gray-300">
            <h3 class="mb-3 text-[17px] font-semibold text-black dark:text-white">I. Хронологический обзор обсуждения</h3>
            <ol class="mb-6 list-decimal space-y-4 pl-4 marker:font-bold marker:text-black dark:marker:text-white">
              <li>
                <strong class="dark:text-white">Вступительное слово и ретроспектива прошлого квартала.</strong> Собрание открыл [Должность, ФИО], представив детальный отчет по
                итогам завершенного квартала. Были озвучены итоговые цифры по выручке, процент выполнения плана и ключевые показатели конверсии.
              </li>
              <li>
                <strong class="dark:text-white">Презентация глобальной стратегии компании на новый квартал.</strong> Руководство транслировало вектор развития компании на
                предстоящие три месяца. Основной упор в обсуждении был сделан на то, как глобальные бизнес-цели напрямую зависят от эффективности отдела продаж.
              </li>
              <li>
                <strong class="dark:text-white">Сессия формирования OKR (Objectives and Key Results).</strong> Команда перешла к разработке квартальных целей и ключевых
                результатов. Были предложены и скорректированы приоритетные направления: фокус на LTV текущих клиентов, снижение цикла сделки и увеличение среднего чека.
              </li>
            </ol>

            <h3 class="mb-3 text-[17px] font-semibold text-black dark:text-white">II. Принятые решения</h3>
            <ol class="list-decimal space-y-3 pl-4 marker:font-bold marker:text-black dark:marker:text-white">
              <li><strong class="dark:text-white">Утвердить итоги прошлого квартала:</strong> Признать работу отдела успешной, зафиксировать процент выполнения.</li>
              <li>
                <strong class="dark:text-white">Утвердить командные OKR на следующий квартал:</strong>
                <ul class="mt-2 list-disc space-y-1 pl-5">
                  <li>Цель (Objective) 1: <strong class="dark:text-white">[Увеличить проникновение в Enterprise-сегмент].</strong></li>
                  <li>Ключевые результаты (KR): <strong class="dark:text-white">[Метрика 1], [Метрика 2].</strong></li>
                </ul>
              </li>
              <li><strong class="dark:text-white">Распределить зоны ответственности:</strong> Назначить руководителей групп ответственными за декомпозицию.</li>
            </ol>
          </div>
        </div>

        <div class="dark:bg-dark flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors dark:border-[#FFFFFF10]">
          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 py-4 transition-colors dark:border-[#FFFFFF10] dark:bg-transparent">
            <h2 class="mt-1 text-lg font-semibold text-black transition-colors dark:text-white">Стенограмма</h2>
            <button
              class="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <svg class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Скачать
            </button>
          </div>
          <div class="custom-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            <div v-for="(phrase, index) in transcript" :key="index" class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span :class="['rounded-full px-3 py-1 text-[11px] font-bold tracking-wider uppercase transition-colors', getSpeakerColor(phrase.speaker)]">
                  {{ phrase.speaker }}
                </span>
                <span class="rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-400 transition-colors dark:bg-white/10 dark:text-gray-400">
                  {{ phrase.time }}
                </span>
              </div>
              <p class="pr-4 text-[14px] leading-relaxed text-gray-800 transition-colors dark:text-gray-300">
                {{ phrase.text }}
              </p>
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
