<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  Home,
  LayoutTemplate,
  SquareUserRound,
  UsersRound,
  Moon,
  SunDim,
  LogOut,
  Menu,
  X,
} from "@lucide/vue";
import { useTheme } from "../../composables/useTheme";
import { useAuthStore } from "../../stores/auth";

interface Props {
  /**
   * Tailwind max-width класс для внутреннего контейнера шапки.
   * Должен совпадать с шириной основного контента страницы,
   * чтобы логотип/навигация/действия были выровнены по нему.
   * Пример: "max-w-7xl", "max-w-4xl", "max-w-[1800px]".
   */
  maxWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: "max-w-7xl",
});

const route = useRoute();
const { isDark, toggleTheme } = useTheme();
const authStore = useAuthStore();

const isAdmin = computed(() => {
  return authStore.role === "admin" || authStore.role === "creator";
});

// Только креатор управляет пользователями. Админ может лишь добавлять
// пользователей в группы (через раздел «Группы»), поэтому вкладку
// «Пользователи» ему не показываем.
const isCreator = computed(() => authStore.role === "creator");

// Единый список пунктов навигации — используется и в десктопном меню,
// и в выпадающем мобильном, чтобы не дублировать разметку.
const navItems = computed(() =>
  [
    { to: "/dashboard", label: "Главная", icon: Home, show: true },
    { to: "/admin/patterns", label: "Шаблоны", icon: LayoutTemplate, show: true },
    { to: "/admin/users", label: "Пользователи", icon: SquareUserRound, show: isCreator.value },
    { to: "/admin/groups", label: "Группы", icon: UsersRound, show: true },
  ].filter((item) => item.show),
);

const containerClass = computed(
  () =>
    `mx-auto flex h-16 w-full ${props.maxWidth} items-center justify-between px-4 sm:px-6 lg:px-8`,
);

const mobileMenuOpen = ref(false);

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

// Закрываем мобильное меню при переходе на другую страницу.
watch(
  () => route.path,
  () => {
    mobileMenuOpen.value = false;
  },
);

const handleLogout = () => {
  authStore.logout();
};
</script>

<template>
  <header
    class="relative z-40 shrink-0 border-b border-gray-200 bg-white transition-colors dark:border-dark-border dark:bg-dark"
  >
    <div :class="containerClass">
      <router-link to="/dashboard" class="flex items-center">
        <img src="../../assets/images/logo.svg" alt="Логотип" class="h-8" />
      </router-link>

      <!-- Десктопная навигация -->
      <nav
        v-if="isAdmin"
        class="hidden items-center gap-1 rounded-xl border border-gray-100 bg-gray-50/50 p-1 lg:flex dark:border-dark-border dark:bg-dark-card"
      >
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            route.path === item.to
              ? 'bg-blue-600 text-white dark:bg-white dark:text-dark'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-white',
          ]"
        >
          <component :is="item.icon" :size="16" />
          {{ item.label }}
        </router-link>
      </nav>

      <!-- Right Actions -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Theme Toggle -->
        <button
          @click="toggleTheme"
          :class="
            isDark
              ? 'border-dark-border bg-dark-card'
              : 'border-gray-200 bg-gray-100'
          "
          class="relative flex h-8 w-14 cursor-pointer items-center rounded-full border p-1 transition-colors duration-300 focus:outline-none"
        >
          <div
            :class="isDark ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white'"
            class="flex h-6 w-6 transform items-center justify-center rounded-full shadow-sm transition-transform duration-300"
          >
            <Moon v-if="isDark" :size="14" color="#1a1a1a" :stroke-width="2.5" />
            <SunDim v-else :size="14" color="#6a7282" :stroke-width="2.5" />
          </div>
        </button>

        <!-- Logout Button -->
        <button
          @click="handleLogout"
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-white"
        >
          <LogOut :size="18" />
        </button>

        <!-- Кнопка мобильного меню (только для админов/креаторов) -->
        <button
          v-if="isAdmin"
          @click="toggleMobileMenu"
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 lg:hidden dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-white"
          :aria-expanded="mobileMenuOpen"
          aria-label="Меню навигации"
        >
          <X v-if="mobileMenuOpen" :size="20" />
          <Menu v-else :size="20" />
        </button>
      </div>
    </div>

    <!-- Мобильное выпадающее меню -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <nav
        v-if="isAdmin && mobileMenuOpen"
        class="absolute inset-x-0 top-16 z-40 border-b border-gray-200 bg-white p-3 shadow-lg lg:hidden dark:border-dark-border dark:bg-dark"
      >
        <div class="mx-auto flex w-full max-w-7xl flex-col gap-1">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :class="[
              'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
              route.path === item.to
                ? 'bg-blue-600 text-white dark:bg-white dark:text-dark'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-white',
            ]"
          >
            <component :is="item.icon" :size="18" />
            {{ item.label }}
          </router-link>
        </div>
      </nav>
    </Transition>

    <!-- Подложка для закрытия меню по клику вне его -->
    <div
      v-if="isAdmin && mobileMenuOpen"
      class="fixed inset-0 top-16 z-30 lg:hidden"
      @click="mobileMenuOpen = false"
    />
  </header>
</template>
