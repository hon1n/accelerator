<script setup lang="ts">
import { reactive } from "vue";
import { useAuthStore } from "../stores/auth";
import BaseInput from "../components/ui/BaseInput.vue";
import BaseButton from "../components/ui/BaseButton.vue";
import BaseCheckbox from "../components/ui/BaseCheckbox.vue";

import { CircleX } from "@lucide/vue";

const authStore = useAuthStore();

const form = reactive({
  login: "",
  password: "",
  rememberMe: false,
});

const handleLogin = async () => {
  if (!form.login || !form.password) return;
  await authStore.login(form.login, form.password, form.rememberMe);
};
</script>

<template>
  <main class="flex min-h-screen w-full bg-white">
    <div class="flex flex-1 flex-col items-center justify-center p-6 sm:p-12">
      <div class="w-full max-w-100">
        <div class="mb-4.5">
          <h1 class="mb-4.5 text-4xl font-semibold text-black">Авторизация</h1>
          <p class="text-sm leading-5 text-[#B9B9B9]">
            Войдите в корпоративную платформу интеллектуального протоколирования совещаний. Все ваши аудиозаписи и конспекты надежно обрабатываются внутри защищенного контура.
          </p>
        </div>

        <div v-if="authStore.error" class="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          <CircleX :size="16" />
          {{ authStore.error }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <BaseInput v-model="form.login" label="Логин" placeholder="Введите логин" type="text" required />

          <BaseInput v-model="form.password" label="Пароль" placeholder="Введите пароль" type="password" required />

          <BaseCheckbox v-model="form.rememberMe"> Запомнить меня </BaseCheckbox>

          <div class="pt-2">
            <BaseButton :is-loading="authStore.isLoading" type="submit"> Авторизоваться </BaseButton>
          </div>
        </form>
      </div>
    </div>

    <div class="hidden p-4 lg:block lg:w-[50%]">
      <div class="relative h-[calc(100vh-2rem)] w-full overflow-hidden rounded-2xl bg-gray-100">
        <img src="../assets/images/auth.jpg" alt="Конференцсвязь" class="h-full w-full object-cover" />
      </div>
    </div>
  </main>
</template>
