<script setup lang="ts">
import { ref } from "vue";
import { Clock, AudioLines, Cpu, Check, RefreshCw, FileText } from "@lucide/vue";

import Header from "../components/layout/Header.vue";

const stats = ref({
  elapsed: "10:52",
  elapsedUnit: "мин",
  duration: "01:23:52",
  durationUnit: "час",
  remaining: "~09:37",
  remainingUnit: "мин",
});

const steps = ref([
  {
    id: 1,
    title: "Удаление шумов",
    subtitle: "FFMPEG Денойзинг",
    status: "done",
    badgeText: "Продолжительность: 00:02:22",
  },
  {
    id: 2,
    title: "Распознавание речи",
    subtitle: "Whisper Large v3",
    status: "in_progress",
    badgeText: "В процессе",
  },
  {
    id: 3,
    title: "Разделение спикеров",
    subtitle: "Whisper Large v3",
    status: "pending",
    badgeText: "Запланировано",
  },
  {
    id: 4,
    title: "Создание конспекта",
    subtitle: "Шаблон: Название шаблона",
    status: "pending",
    badgeText: "Запланировано",
  },
]);
</script>

<template>
  <div class="dark:bg-dark min-h-screen bg-white text-gray-900 transition-colors duration-300 dark:text-gray-200">
    <Header />

    <main class="mx-auto w-full max-w-5xl px-4 py-8">
      <div class="mb-6">
        <p class="mb-1 text-sm text-[#A8A9AC] dark:text-gray-400">Запись в процессе обработки</p>
        <h1 class="text-2xl font-bold text-black transition-colors dark:text-white">Квартальное планирование: Цели и OKR отдела продаж</h1>
      </div>

      <div class="flex flex-col gap-6">
        <div
          class="grid grid-cols-1 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white transition-colors md:grid-cols-3 md:divide-x md:divide-y-0 dark:divide-[#FFFFFF10] dark:border-[#FFFFFF10] dark:bg-white/5"
        >
          <div class="flex flex-col items-center justify-center py-8">
            <div class="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              <Clock class="h-4 w-4" />
              Прошедшее время
            </div>
            <div class="flex items-baseline gap-1">
              <span class="text-[40px] leading-none font-bold text-gray-900 transition-colors dark:text-white">{{ stats.elapsed }}</span>
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stats.elapsedUnit }}</span>
            </div>
          </div>

          <div class="flex flex-col items-center justify-center py-8">
            <div class="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              <AudioLines class="h-4 w-4" />
              Длительность аудиозаписи
            </div>
            <div class="flex items-baseline gap-1">
              <span class="text-[40px] leading-none font-bold text-gray-900 transition-colors dark:text-white">{{ stats.duration }}</span>
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stats.durationUnit }}</span>
            </div>
          </div>

          <div class="flex flex-col items-center justify-center py-8">
            <div class="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              <Cpu class="h-4 w-4" />
              Оставшееся время
            </div>
            <div class="flex items-baseline gap-1">
              <span class="text-[40px] leading-none font-bold text-gray-900 transition-colors dark:text-white">{{ stats.remaining }}</span>
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stats.remainingUnit }}</span>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-8 transition-colors md:p-12 dark:border-[#FFFFFF10] dark:bg-white/5">
          <div class="flex w-full items-start">
            <div v-for="(step, index) in steps" :key="step.id" class="relative flex flex-1 flex-col items-center">
              <div
                v-if="index < steps.length - 1"
                class="absolute top-5 left-[calc(50%+1.5rem)] w-[calc(100%-3rem)] border-t-2 border-dashed border-gray-200 transition-colors dark:border-[#FFFFFF20]"
              ></div>

              <div
                :class="[
                  'relative z-10 mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                  step.status === 'done' ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' : '',
                  step.status === 'in_progress' ? 'bg-yellow-50 text-yellow-500 dark:bg-yellow-500/20 dark:text-yellow-400' : '',
                  step.status === 'pending' ? 'bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-gray-500' : '',
                ]"
              >
                <Check v-if="step.status === 'done'" class="h-5 w-5" />
                <RefreshCw v-if="step.status === 'in_progress'" class="h-5 w-5 animate-spin" />
                <AudioLines v-if="step.status === 'pending' && index === 2" class="h-5 w-5" />
                <FileText v-if="step.status === 'pending' && index === 3" class="h-5 w-5" />
              </div>

              <h3 class="mb-1 text-center text-[13px] font-bold text-gray-900 transition-colors md:text-[15px] dark:text-white">
                {{ step.title }}
              </h3>
              <p class="mb-3 text-center text-[11px] text-gray-400 transition-colors md:text-xs dark:text-gray-500">
                {{ step.subtitle }}
              </p>

              <div
                :class="[
                  'inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  step.status === 'done' ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : '',
                  step.status === 'in_progress' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400' : '',
                  step.status === 'pending' ? 'bg-gray-50 text-gray-400 dark:bg-white/5 dark:text-gray-500' : '',
                ]"
              >
                {{ step.badgeText }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
