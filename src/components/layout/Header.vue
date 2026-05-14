<script setup lang="ts">
import { useRoute } from "vue-router";
import { House, LayoutTemplate, SquareUserRound, UsersRound, Moon, SunDim } from "@lucide/vue"; // Добавили иконки луны и солнца для красоты (опционально)
import { useTheme } from "../../composables/useTheme";

const route = useRoute();
const { isDark, toggleTheme } = useTheme();
</script>

<template>
  <header class="dark:bg-dark shrink-0 border-b border-gray-200 bg-white transition-colors dark:border-gray-800">
    <div class="mx-auto flex h-22.5 w-full max-w-300 items-center justify-between px-4">
      <!-- Логотип как ссылка на главную -->
      <router-link to="/dashboard" class="cursor-pointer">
        <img src="../../assets/images/logo.svg" alt="Логотип" />
      </router-link>

      <!-- Навигация -->
      <nav class="flex items-center gap-1 rounded-xl border border-gray-100 bg-gray-50/50 p-1 dark:border-[#FFFFFF10] dark:bg-white/2">
        <!-- Главная (активна ТОЛЬКО строго на /dashboard) -->
        <router-link
          to="/dashboard"
          :class="[
            'flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
            route.path === '/dashboard' ? 'text-primary bg-primary/10' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-gray-200',
          ]"
        >
          <House :size="16" />
          Главная
        </router-link>

        <!-- Остальные ссылки (пока заглушки) -->
        <a
          href="#"
          class="flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-gray-200"
        >
          <LayoutTemplate :size="16" />
          Шаблоны
        </a>
        <a
          href="#"
          class="flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-gray-200"
        >
          <SquareUserRound :size="16" />
          Пользователи
        </a>
        <a
          href="#"
          class="flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-gray-200"
        >
          <UsersRound :size="16" />
          Группы
        </a>

        <!-- Селект менеджеров -->
        <button
          class="ml-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-[#FFFFFF10] dark:text-gray-200 dark:bg-dark dark:hover:bg-white/5 dark:hover:text-gray-200"
        >
          Менеджеры
          <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </nav>

      <!-- Переключатель темы -->
      <!-- Переключатель темы -->
      <div class="flex items-center">
        <button
          @click="toggleTheme"
          :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'"
          class="relative flex h-8 w-14 items-center rounded-full border p-1 transition-colors duration-300 focus:outline-none"
        >
          <!-- Кружок с иконкой внутри -->
          <div
            :class="isDark ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white'"
            class="flex h-6 w-6 transform items-center justify-center rounded-full shadow-sm transition-transform duration-300"
          >
            <!-- Иконка Луны (для темной темы) -->
            <Moon v-if="isDark" class="h-3.5 w-3.5 text-gray-300" :stroke-width="2.5" />

            <!-- Иконка Солнца (для светлой темы) -->
            <SunDim v-else class="h-3.5 w-3.5 text-gray-500" :stroke-width="2.5" />
          </div>
        </button>
      </div>
    </div>
  </header>
</template>
