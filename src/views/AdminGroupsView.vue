<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Plus, Pencil, Trash2, X, Save, UserPlus, UserMinus, Users, Search } from "@lucide/vue";

import Header from "../components/layout/Header.vue";
import Input from "../components/ui/Input.vue";

interface User {
  id: string;
  name: string;
  email: string;
  position: string;
  role: "admin" | "user";
}

interface Group {
  id: string;
  name: string;
  prefix: string;
  colorClass: string;
  users: User[];
}

const allUsers = ref<User[]>([
  { id: "1", name: "Хонин Алексей Валерьевич", email: "hon1n@hon1n.ru", position: "Разработчик", role: "admin" },
  { id: "2", name: "Ицков Дмитрий Олегович", email: "zavet@zavet.ru", position: "Разработчик", role: "user" },
  { id: "3", name: "Матвейкин Иван Алексеевич", email: "onda@andar.ru", position: "Менеджер", role: "user" },
  { id: "4", name: "Иванов Петр Сергеевич", email: "ivanov@test.ru", position: "Аналитик", role: "user" },
  { id: "5", name: "Смирнова Анна Ивановна", email: "smirnova@test.ru", position: "Дизайнер", role: "admin" },
]);

const groups = ref<Group[]>([
  {
    id: "g1",
    name: "Разработчики",
    prefix: "Р",
    colorClass: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
    users: [allUsers.value[0], allUsers.value[1]],
  },
  {
    id: "g2",
    name: "Менеджеры",
    prefix: "М",
    colorClass: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    users: [allUsers.value[2]],
  },
  {
    id: "g3",
    name: "Дизайнеры",
    prefix: "Д",
    colorClass: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    users: [],
  },
]);

const activeGroupId = ref<string>("g1");
const activeGroup = computed(() => groups.value.find((g) => g.id === activeGroupId.value) || groups.value[0]);

const userSearchQuery = ref("");

const availableUsersToAdd = computed(() => {
  return allUsers.value.filter((user) => {
    const isAlreadyInGroup = activeGroup.value.users.some((u) => u.id === user.id);
    const matchesSearch = user.name.toLowerCase().includes(userSearchQuery.value.toLowerCase()) || user.email.toLowerCase().includes(userSearchQuery.value.toLowerCase());
    return !isAlreadyInGroup && matchesSearch;
  });
});

const addUserToGroup = (user: User) => {
  activeGroup.value.users.push(user);
  userSearchQuery.value = "";
};

const removeUserFromGroup = (userId: string) => {
  activeGroup.value.users = activeGroup.value.users.filter((u) => u.id !== userId);
};

const isSidePanelOpen = ref(false);
const panelMode = ref<"create" | "edit">("create");

const form = ref({
  id: "",
  name: "",
  prefix: "",
  colorClass: "",
});

watch(
  () => form.value.name,
  (newName) => {
    form.value.prefix = newName ? newName.charAt(0).toUpperCase() : "";
  }
);

const colorPresets = [
  "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
  "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400",
  "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
  "bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400",
  "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
];

const openCreateGroupPanel = () => {
  panelMode.value = "create";
  form.value = { id: "", name: "", prefix: "", colorClass: colorPresets[0] };
  isSidePanelOpen.value = true;
};

const openEditGroupPanel = () => {
  panelMode.value = "edit";
  form.value = {
    id: activeGroup.value.id,
    name: activeGroup.value.name,
    prefix: activeGroup.value.prefix,
    colorClass: activeGroup.value.colorClass,
  };
  isSidePanelOpen.value = true;
};

const closePanel = () => {
  isSidePanelOpen.value = false;
};

const isDeleteModalOpen = ref(false);
const deleteGroup = () => {
  console.log("Удаление группы", activeGroup.value.id);
  isDeleteModalOpen.value = false;
};
</script>

<template>
  <div class="dark:bg-dark relative flex h-screen w-full flex-col overflow-hidden bg-white text-gray-900 transition-colors duration-300 dark:text-gray-200">
    <Header />

    <div class="relative flex min-h-0 flex-1 overflow-hidden">
      <main class="mx-auto flex min-h-0 w-full max-w-450 flex-1 flex-col gap-6 px-4 py-6 transition-all duration-300">
        <div class="flex shrink-0 items-center justify-between">
          <div>
            <p class="mb-1 text-sm text-[#A8A9AC] dark:text-gray-400">Управление</p>
            <h1 class="text-2xl font-bold text-black transition-colors dark:text-white">Группы</h1>
          </div>
          <button
            @click="openCreateGroupPanel"
            class="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus class="h-4 w-4" />
            <span class="hidden sm:inline">Новая группа</span>
          </button>
        </div>

        <div class="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
          <div
            class="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors lg:col-span-4 xl:col-span-3 dark:border-[#FFFFFF10] dark:bg-white/5"
          >
            <div class="shrink-0 border-b border-gray-100 p-5 transition-colors dark:border-[#FFFFFF10]">
              <h2 class="text-sm font-semibold text-gray-900 transition-colors dark:text-white">Список групп</h2>
            </div>

            <div class="custom-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto p-4">
              <button
                v-for="group in groups"
                :key="group.id"
                @click="activeGroupId = group.id"
                :class="[
                  'flex shrink-0 items-center justify-between rounded-xl p-3 text-left transition-colors',
                  activeGroupId === group.id ? 'bg-gray-50 dark:bg-white/10' : 'hover:bg-gray-50/50 dark:hover:bg-white/5',
                ]"
              >
                <div class="flex items-center gap-3">
                  <div :class="['flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold', group.colorClass]">
                    {{ group.prefix }}
                  </div>
                  <div>
                    <h3 class="text-[14px] font-medium text-gray-900 transition-colors dark:text-white">{{ group.name }}</h3>
                    <p class="text-xs text-gray-500 transition-colors dark:text-gray-400">{{ group.users.length }} участников</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div
            class="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors lg:col-span-8 xl:col-span-9 dark:border-[#FFFFFF10] dark:bg-white/5"
          >
            <div class="flex shrink-0 flex-col justify-between gap-4 border-b border-gray-100 p-5 transition-colors sm:flex-row sm:items-center dark:border-[#FFFFFF10]">
              <div class="flex items-center gap-3">
                <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold', activeGroup.colorClass]">
                  {{ activeGroup.prefix }}
                </div>
                <div>
                  <h2 class="text-lg font-bold text-black transition-colors dark:text-white">{{ activeGroup.name }}</h2>
                  <p class="text-sm text-gray-500 transition-colors dark:text-gray-400">Участники группы</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="openEditGroupPanel"
                  class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#FFFFFF10] dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Pencil class="h-4 w-4" />
                  <span class="hidden sm:inline">Настроить</span>
                </button>
                <button
                  @click="isDeleteModalOpen = true"
                  class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-3 text-sm font-medium text-red-500 transition-colors hover:border-red-200 hover:bg-red-50 dark:border-[#FFFFFF10] dark:text-red-400 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div class="custom-scrollbar flex flex-1 flex-col overflow-y-auto">
              <div class="border-b border-gray-100 bg-gray-50/50 p-5 transition-colors dark:border-[#FFFFFF10] dark:bg-white/5">
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Добавить пользователя</label>
                <div class="relative max-w-lg">
                  <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search class="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    v-model="userSearchQuery"
                    type="text"
                    placeholder="Поиск по имени или email..."
                    class="block w-full rounded-lg border border-gray-200 bg-white py-2.5 pr-3 pl-10 text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-[#FFFFFF10] dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
                  />

                  <div v-if="userSearchQuery" class="absolute z-20 mt-1 w-full rounded-lg border border-gray-100 bg-white py-1 shadow-lg dark:border-[#FFFFFF10] dark:bg-gray-900">
                    <div class="custom-scrollbar max-h-60 overflow-y-auto">
                      <div v-if="availableUsersToAdd.length === 0" class="p-3 text-center text-sm text-gray-500">Пользователи не найдены</div>
                      <button
                        v-for="user in availableUsersToAdd"
                        :key="user.id"
                        @click="addUserToGroup(user)"
                        class="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        <div class="flex min-w-0 flex-col pr-2">
                          <div class="flex items-center gap-2">
                            <span class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ user.name }}</span>
                            <span
                              :class="[
                                'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                                user.role === 'admin'
                                  ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
                              ]"
                            >
                              {{ user.role === "admin" ? "Админ" : "Пользователь" }}
                            </span>
                          </div>
                          <span class="truncate text-xs text-gray-500">{{ user.email }}</span>
                        </div>
                        <UserPlus class="h-4 w-4 shrink-0 text-blue-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="p-5">
                <div v-if="activeGroup.users.length === 0" class="py-12 text-center text-gray-500 dark:text-gray-400">
                  <Users class="mx-auto mb-3 h-8 w-8 opacity-20" />
                  <p class="text-sm">В этой группе пока нет пользователей</p>
                </div>

                <div v-else class="flex flex-col gap-3">
                  <div
                    v-for="user in activeGroup.users"
                    :key="user.id"
                    class="flex items-center justify-between rounded-xl border border-gray-100 p-4 transition-colors hover:border-gray-200 dark:border-[#FFFFFF10] dark:hover:border-[#FFFFFF20]"
                  >
                    <div class="flex min-w-0 items-center gap-4">
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                        {{ user.name.charAt(0) }}
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ user.name }}</p>

                        <div class="mt-1 flex flex-wrap items-center gap-2">
                          <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ user.email }}</p>
                          <span class="text-gray-300 dark:text-gray-600">•</span>
                          <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ user.position }}</p>
                          <span class="text-gray-300 dark:text-gray-600">•</span>
                          <span
                            :class="[
                              'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                              user.role === 'admin'
                                ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
                            ]"
                          >
                            {{ user.role === "admin" ? "Админ" : "Пользователь" }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      @click="removeUserFromGroup(user.id)"
                      class="flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      title="Удалить из группы"
                    >
                      <UserMinus class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div v-if="isSidePanelOpen" class="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity lg:hidden" @click="closePanel"></div>

      <aside
        v-if="isSidePanelOpen"
        class="dark:bg-dark fixed inset-y-0 right-0 z-40 flex w-full max-w-90 flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:shrink-0 lg:shadow-none dark:border-[#FFFFFF10]"
      >
        <div class="flex items-center justify-between border-b border-gray-100 p-6 dark:border-[#FFFFFF10]">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
            {{ panelMode === "create" ? "Создание группы" : "Настройки группы" }}
          </h2>
          <button
            @click="closePanel"
            class="cursor-pointer rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="custom-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          <Input v-model="form.name" label="Название группы" type="text" placeholder="Например: Маркетинг" />

          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-700 transition-colors dark:text-gray-300">Цветовая тема</label>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="color in colorPresets"
                :key="color"
                @click="form.colorClass = color"
                class="dark:focus:ring-offset-dark relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                :class="color"
              >
                <div v-if="form.colorClass === color" class="absolute inset-0 scale-110 rounded-full border-2 border-current opacity-50"></div>
                <span class="text-xs font-bold">{{ form.prefix || "А" }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="shrink-0 border-t border-gray-100 p-6 dark:border-[#FFFFFF10]">
          <button
            class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus v-if="panelMode === 'create'" class="h-4 w-4 shrink-0" />
            <Save v-else class="h-4 w-4 shrink-0" />
            <span class="truncate">{{ panelMode === "create" ? "Создать группу" : "Сохранить изменения" }}</span>
          </button>
        </div>
      </aside>
    </div>

    <Teleport to="body">
      <div v-if="isDeleteModalOpen" class="font-inter fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" @click="isDeleteModalOpen = false"></div>

        <div class="relative w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-xl transition-all dark:border-[#FFFFFF10] dark:bg-gray-900">
          <h3 class="mb-2 text-lg font-bold text-gray-900 dark:text-white">Удаление группы</h3>
          <p class="mb-6 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Вы уверены, что хотите удалить группу <strong>{{ activeGroup.name }}</strong
            >?<br />
            Пользователи не будут удалены из системы, но покинут эту группу.
          </p>

          <div class="flex items-center gap-3">
            <button
              @click="isDeleteModalOpen = false"
              class="flex-1 cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-[#FFFFFF10] dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            >
              Отмена
            </button>
            <button @click="deleteGroup" class="flex-1 cursor-pointer rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700">
              Удалить
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
