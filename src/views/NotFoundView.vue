<script setup lang="ts">
import { useRouter } from "vue-router";
import Button from "../components/ui/Button.vue";

const router = useRouter();

const goHome = () => {
  router.push({ name: "Home" });
};
</script>

<template>
  <main class="flex h-dvh w-full items-center justify-center bg-white dark:bg-dark">
    <div class="flex flex-col items-center gap-6 px-6 text-center">
      <h1 class="text-8xl font-bold text-gray-200 dark:text-gray-700">404</h1>
      <h2 class="text-2xl font-semibold text-black dark:text-white">Страница не найдена</h2>
      <p class="max-w-md text-sm leading-5 text-[#B9B9B9] dark:text-gray-500">
        Запрашиваемая страница не существует или была перемещена. Проверьте правильность адреса или вернитесь на главную.
      </p>
      <div class="pt-2">
        <Button @click="goHome">На главную</Button>
      </div>
    </div>
  </main>
</template>
