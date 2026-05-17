<script setup lang="ts">
import { ref } from "vue";
import { Plus, Pencil, RefreshCw, Trash2, X, Save } from "@lucide/vue";

import Header from "../components/layout/Header.vue";

interface UserGroup {
  id: string;
  name: string;
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
      { id: "g1", name: "P", colorClass: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400" },
      { id: "g2", name: "M", colorClass: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" },
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
    groups: [{ id: "g1", name: "P", colorClass: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400" }],
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
    groups: [{ id: "g3", name: "M", colorClass: "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400" }],
  },
]);

const isSidePanelOpen = ref(false);
const panelMode = ref<"create" | "edit">("create");

const form = ref({
  id: "",
  firstName: "",
  lastName: "",
  patronymic: "",
  role: "Пользователь",
  position: "",
  login: "",
});

const roleOptions = ["Администратор", "Пользователь"];

const openCreatePanel = () => {
  panelMode.value = "create";
  form.value = { id: "", firstName: "", lastName: "", patronymic: "", role: "Пользователь", position: "", login: "" };
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
                <p class="mb-1 text-sm text-[#A8A9AC] dark:text-gray-400">Управление пользователями</p>
                <h1 class="text-2xl font-bold text-black transition-colors dark:text-white">Список пользователей</h1>
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
                <div class="col-span-1 lg:col-span-1">Группы</div>
                <div class="col-span-3 lg:col-span-3">Действия</div>
              </div>

              <div class="flex flex-col">
                <div
                  v-for="user in users"
                  :key="user.id"
                  class="grid grid-cols-12 items-center gap-4 border-b border-gray-100 px-6 py-4 transition-colors last:border-0 hover:bg-gray-50/50 dark:border-[#FFFFFF10] dark:hover:bg-white/5"
                >
                  <div class="col-span-4 flex flex-col lg:col-span-3">
                    <span class="text-[15px] font-semibold text-gray-900 dark:text-white"> {{ user.lastName }} {{ user.firstName }} {{ user.patronymic }} </span>
                    <span class="mt-0.5 text-sm text-gray-400">{{ user.email }}</span>
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

                  <div class="col-span-2 flex items-center text-sm font-medium text-gray-900 dark:text-gray-200">
                    {{ user.position }}
                  </div>

                  <div class="col-span-1 flex items-center gap-1 lg:col-span-1">
                    <div v-for="group in user.groups" :key="group.id" class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" :class="group.colorClass">
                      {{ group.name }}
                    </div>
                    <div
                      v-if="user.role === 'admin'"
                      class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 dark:bg-white/10 dark:text-gray-400"
                    >
                      +2
                    </div>
                  </div>

                  <div class="col-span-3 flex items-center gap-2 lg:col-span-3">
                    <button
                      @click="openEditPanel(user)"
                      class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:bg-white/10"
                      :title="isSidePanelOpen ? 'Редактировать' : ''"
                    >
                      <Pencil class="h-3.5 w-3.5" />
                      <span v-if="!isSidePanelOpen">Редактировать</span>
                    </button>

                    <button
                      @click="confirmAction('reset', user)"
                      class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:bg-white/10"
                      :title="isSidePanelOpen ? 'Сбросить пароль' : ''"
                    >
                      <RefreshCw class="h-3.5 w-3.5" />
                      <span v-if="!isSidePanelOpen">Сбросить пароль</span>
                    </button>

                    <button
                      @click="confirmAction('delete', user)"
                      class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:border-red-200 hover:bg-red-50 dark:border-[#FFFFFF10] dark:text-red-400 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
                      :title="isSidePanelOpen ? 'Удалить' : ''"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                      <span v-if="!isSidePanelOpen">Удалить</span>
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
            class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="custom-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-gray-600 dark:text-gray-400">Имя</label>
            <input
              v-model="form.firstName"
              type="text"
              placeholder="Введите имя"
              class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#FFFFFF10] dark:bg-black/20 dark:text-white"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-gray-600 dark:text-gray-400">Фамилия</label>
            <input
              v-model="form.lastName"
              type="text"
              placeholder="Введите фамилию"
              class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#FFFFFF10] dark:bg-black/20 dark:text-white"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-gray-600 dark:text-gray-400">Отчество <span class="text-gray-400">(при наличии)</span></label>
            <input
              v-model="form.patronymic"
              type="text"
              placeholder="Введите отчество"
              class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#FFFFFF10] dark:bg-black/20 dark:text-white"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-gray-600 dark:text-gray-400">Роль</label>
            <select
              v-model="form.role"
              class="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#FFFFFF10] dark:bg-black/20 dark:text-white"
            >
              <option v-for="role in roleOptions" :key="role">{{ role }}</option>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-gray-600 dark:text-gray-400">Должность</label>
            <input
              v-model="form.position"
              type="text"
              placeholder="Введите должность"
              class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#FFFFFF10] dark:bg-black/20 dark:text-white"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-gray-600 dark:text-gray-400">Логин</label>
            <input
              v-model="form.login"
              type="text"
              placeholder="Введите логин"
              class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#FFFFFF10] dark:bg-black/20 dark:text-white"
            />
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
