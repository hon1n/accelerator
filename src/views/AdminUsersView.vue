<script setup lang="ts">
import { ref } from "vue";
import { Plus, Pencil, RefreshCw, Trash2, X, Save, Copy, Check } from "@lucide/vue";

import Header from "../components/layout/Header.vue";
import Select from "../components/ui/Select.vue";
import Input from "../components/ui/Input.vue";

interface UserGroup {
  id: string;
  name: string;
  fullName: string;
  colorClass: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  email: string;
  role: "admin" | "user";
  position: string;
  groups: UserGroup[];
  login: string;
}

const users = ref<User[]>([
  {
    id: "1",
    firstName: "Алексей",
    lastName: "Хонин",
    patronymic: "Валерьевич",
    email: "hon1n@hon1n.ru",
    role: "admin",
    position: "Разработчик",
    login: "hon1n@hon1n.ru",
    groups: [
      { id: "g1", name: "P", fullName: "Разработчики", colorClass: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400" },
      { id: "g2", name: "M", fullName: "Менеджеры", colorClass: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" },
      { id: "g4", name: "Д", fullName: "Дизайнеры", colorClass: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400" },
      { id: "g5", name: "А", fullName: "Аналитики", colorClass: "bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400" },
    ],
  },
  {
    id: "2",
    firstName: "Дмитрий",
    lastName: "Ицков",
    patronymic: "Олегович",
    email: "zavet@zavet.ru",
    role: "user",
    position: "Разработчик",
    login: "zavet@zavet.ru",
    groups: [{ id: "g1", name: "P", fullName: "Разработчики", colorClass: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400" }],
  },
  {
    id: "3",
    firstName: "Иван",
    lastName: "Матвейкин",
    patronymic: "Алексеевич",
    email: "onda@andar.ru",
    role: "user",
    position: "Менеджер",
    login: "onda@andar.ru",
    groups: [{ id: "g3", name: "M", fullName: "Маркетинг", colorClass: "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400" }],
  },
]);

const isSidePanelOpen = ref(false);
const panelMode = ref<"create" | "edit">("create");
const roles = ["Пользователь", "Администратор"];
const isCopied = ref(false);

const form = ref({
  id: "",
  firstName: "",
  lastName: "",
  patronymic: "",
  role: "Пользователь",
  position: "",
  login: "",
  password: "",
});

const generatePassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let pass = "";
  for (let i = 0; i < 20; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

const copyPassword = async () => {
  if (form.value.password) {
    try {
      await navigator.clipboard.writeText(form.value.password);
      isCopied.value = true;
      setTimeout(() => {
        isCopied.value = false;
      }, 2000);
    } catch (err) {
      console.error("Не удалось скопировать пароль", err);
    }
  }
};

const openCreatePanel = () => {
  panelMode.value = "create";
  form.value = {
    id: "",
    firstName: "",
    lastName: "",
    patronymic: "",
    role: "Пользователь",
    position: "",
    login: "",
    password: generatePassword(),
  };
  isCopied.value = false;
  isSidePanelOpen.value = true;
};

const openEditPanel = (user: User) => {
  panelMode.value = "edit";
  form.value = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    patronymic: user.patronymic || "",
    role: user.role === "admin" ? "Администратор" : "Пользователь",
    position: user.position,
    login: user.login,
    password: "",
  };
  isSidePanelOpen.value = true;
};

const closePanel = () => {
  isSidePanelOpen.value = false;
};

const isModalOpen = ref(false);
const modalAction = ref<"delete" | "reset">("delete");
const targetUser = ref<User | null>(null);

const confirmAction = (action: "delete" | "reset", user: User) => {
  modalAction.value = action;
  targetUser.value = user;
  isModalOpen.value = true;
};

const executeModalAction = () => {
  if (modalAction.value === "delete") {
    console.log(`Удаление пользователя ${targetUser.value?.id}`);
  } else if (modalAction.value === "reset") {
    console.log(`Сброс пароля пользователя ${targetUser.value?.id}`);
  }
  isModalOpen.value = false;
};
</script>

<template>
  <div class="dark:bg-dark relative flex h-screen w-full flex-col overflow-hidden bg-white text-gray-900 transition-colors duration-300 dark:text-gray-200">
    <Header />

    <div class="flex min-h-0 flex-1 overflow-hidden">
      <main class="flex min-w-0 flex-1 flex-col transition-all duration-300">
        <div class="custom-scrollbar flex-1 overflow-y-auto p-6">
          <div class="mx-auto w-full max-w-450">
            <div class="mb-6 flex items-center justify-between">
              <div>
                <p class="mb-1 text-sm text-[#A8A9AC] dark:text-gray-400">Управление</p>
                <h1 class="text-2xl font-bold text-black transition-colors dark:text-white">Пользователи</h1>
              </div>
              <button
                @click="openCreatePanel"
                class="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus class="h-4 w-4" />
                <span v-if="!isSidePanelOpen" class="hidden sm:inline">Создать пользователя</span>
              </button>
            </div>

            <div class="rounded-xl border border-gray-200 bg-white transition-colors dark:border-[#FFFFFF10] dark:bg-white/5">
              <div
                class="grid grid-cols-12 gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-4 text-xs font-semibold tracking-wider text-gray-500 uppercase transition-colors dark:border-[#FFFFFF10] dark:bg-white/5 dark:text-gray-400"
              >
                <div class="col-span-4 lg:col-span-3">Имя / Email</div>
                <div class="col-span-2">Роль</div>
                <div class="col-span-2">Должность</div>
                <div class="col-span-1 lg:col-span-2">Группы</div>
                <div class="col-span-3 text-right lg:col-span-2 lg:text-left">Действия</div>
              </div>

              <div class="flex flex-col">
                <div
                  v-for="user in users"
                  :key="user.id"
                  class="grid grid-cols-12 items-center gap-4 border-b border-gray-100 px-6 py-4 transition-colors last:border-0 hover:bg-gray-50/50 dark:border-[#FFFFFF10] dark:hover:bg-white/5"
                >
                  <div class="col-span-4 flex flex-col lg:col-span-3">
                    <span class="truncate text-[15px] font-semibold text-gray-900 dark:text-white"> {{ user.lastName }} {{ user.firstName }} {{ user.patronymic }} </span>
                    <span class="mt-0.5 truncate text-sm text-gray-400">{{ user.email }}</span>
                  </div>

                  <div class="col-span-2 flex items-center">
                    <span
                      :class="[
                        'rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase',
                        user.role === 'admin' ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
                      ]"
                    >
                      {{ user.role === "admin" ? "Админ" : "Пользователь" }}
                    </span>
                  </div>

                  <div class="col-span-2 flex items-center truncate pr-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    {{ user.position }}
                  </div>

                  <div class="col-span-1 flex items-center lg:col-span-2">
                    <div class="group relative flex w-max cursor-help items-center gap-1">
                      <div
                        v-for="group in user.groups.slice(0, 2)"
                        :key="group.id"
                        class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                        :class="group.colorClass"
                      >
                        {{ group.name }}
                      </div>

                      <div
                        v-if="user.groups.length > 2"
                        class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 dark:bg-white/10 dark:text-gray-400"
                      >
                        +{{ user.groups.length - 2 }}
                      </div>

                      <div
                        class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:visible group-hover:mb-3 group-hover:opacity-100"
                      >
                        <div class="dark:bg-dark relative rounded-lg bg-white px-3 py-2.5 text-xs text-white shadow-xl">
                          <div class="flex flex-col gap-2 whitespace-nowrap">
                            <div v-for="g in user.groups" :key="g.id" class="flex items-center gap-2.5">
                              <div :class="g.colorClass" class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                                {{ g.name }}
                              </div>
                              <span class="font-medium text-black dark:text-white">{{ g.fullName }}</span>
                            </div>
                          </div>
                          <div class="dark:border-dark absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-white"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="col-span-3 flex items-center justify-end gap-2 lg:col-span-2 lg:justify-start">
                    <button
                      @click="openEditPanel(user)"
                      class="cursor-pointer rounded-lg border border-gray-200 p-3 text-gray-900 transition-colors hover:bg-gray-50 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:bg-white/10"
                      title="Редактировать"
                    >
                      <Pencil :size="16" />
                    </button>

                    <button
                      @click="confirmAction('reset', user)"
                      class="cursor-pointer rounded-lg border border-gray-200 p-3 text-gray-900 transition-colors hover:bg-gray-50 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:bg-white/10"
                      title="Сбросить пароль"
                    >
                      <RefreshCw :size="16" />
                    </button>

                    <button
                      @click="confirmAction('delete', user)"
                      class="cursor-pointer rounded-lg border border-gray-200 p-3 text-red-500 transition-colors hover:border-red-200 hover:bg-red-50 dark:border-[#FFFFFF10] dark:text-red-400 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
                      title="Удалить"
                    >
                      <Trash2 :size="16" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside v-if="isSidePanelOpen" class="dark:bg-dark flex w-90 shrink-0 flex-col border-l border-gray-200 bg-white transition-all duration-300 dark:border-[#FFFFFF10]">
        <div class="flex items-center justify-between border-b border-gray-100 p-6 dark:border-[#FFFFFF10]">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
            {{ panelMode === "create" ? "Создание пользователя" : "Редактирование пользователя" }}
          </h2>
          <button
            @click="closePanel"
            class="cursor-pointer rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="custom-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <Input v-model="form.firstName" label="Имя" type="text" placeholder="Введите имя" />
          <Input v-model="form.lastName" label="Фамилия" type="text" placeholder="Введите фамилию" />
          <Input v-model="form.patronymic" label="Отчество (при наличии)" type="text" placeholder="Введите отчество" />
          <Select v-model="form.role" label="Роль" :options="roles" />
          <Input v-model="form.position" label="Должность" type="text" placeholder="Введите должность" />
          <Input v-model="form.login" label="Логин" type="text" placeholder="Введите логин" />

          <div v-if="panelMode === 'create'" class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-gray-700 transition-colors dark:text-gray-300">Пароль</label>
            <div
              class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm transition-colors dark:border-[#FFFFFF10] dark:bg-black/20"
            >
              <span class="truncate font-mono text-gray-900 dark:text-white">{{ form.password }}</span>
              <button
                type="button"
                @click="copyPassword"
                class="ml-2 flex shrink-0 cursor-pointer items-center justify-center text-gray-400 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                title="Копировать пароль"
              >
                <Check v-if="isCopied" class="h-4 w-4 text-green-500" />
                <Copy v-else class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div class="shrink-0 border-t border-gray-100 p-6 dark:border-[#FFFFFF10]">
          <button
            class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus v-if="panelMode === 'create'" class="h-4 w-4" />
            <Save v-else class="h-4 w-4" />
            {{ panelMode === "create" ? "Создать пользователя" : "Сохранить изменения" }}
          </button>
        </div>
      </aside>
    </div>

    <Teleport to="body">
      <div v-if="isModalOpen" class="font-inter fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" @click="isModalOpen = false"></div>

        <div class="relative w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-xl transition-all dark:border-[#FFFFFF10] dark:bg-gray-900">
          <h3 class="mb-2 text-lg font-bold text-gray-900 dark:text-white">Подтверждение</h3>
          <p class="mb-6 text-sm leading-relaxed text-gray-500 dark:text-gray-400">Вы действительно хотите совершить это действие?<br />Оно является необратимым.</p>

          <div class="flex items-center gap-3">
            <button
              @click="isModalOpen = false"
              class="flex-1 cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-[#FFFFFF10] dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            >
              Отмена
            </button>
            <button @click="executeModalAction" class="flex-1 cursor-pointer rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              Подтвердить
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
