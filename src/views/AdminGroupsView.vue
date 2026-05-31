<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { Plus, Search, Edit, Trash2, Users, Calendar, Crown, UserPlus, ShieldCheck } from "@lucide/vue";
import Header from "../components/layout/Header.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Input from "../components/ui/Input.vue";
import Select from "../components/ui/Select.vue";
import Modal from "../components/ui/Modal.vue";
import Spinner from "../components/ui/Spinner.vue";
import FormError from "../components/ui/FormError.vue";
import { useGroupsStore, groupColorClass, groupPrefix } from "../stores/groups";
import { useUsersStore } from "../stores/users";
import { useAuthStore } from "../stores/auth";
import { extractApiErrorMessage } from "../api";
import { getInitials } from "../utils/initials.ts"
import { formatMeetingDate } from "../utils/taskStatus";
import { useAutoRefresh } from "../composables/useAutoRefresh";

const route = useRoute();
const groupsStore = useGroupsStore();
const usersStore = useUsersStore();
const authStore = useAuthStore();

// Админ может только добавлять участников в группы. Создание, редактирование и
// удаление групп, а также удаление участников — только для креатора.
const isCreator = computed(() => authStore.role === "creator");

const searchQuery = ref("");
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const showMembersModal = ref(false);
const selectedGroupId = ref<string | null>(null);

const createError = ref<string | null>(null);
const editError = ref<string | null>(null);
const deleteError = ref<string | null>(null);
const membersError = ref<string | null>(null);

const createForm = ref({
  name: "",
  description: "",
  ownerId: "",
});

const editForm = ref({
  name: "",
  description: "",
  ownerId: "",
});

const filteredGroups = computed(() => {
  if (!searchQuery.value) return groupsStore.groups;

  const query = searchQuery.value.toLowerCase();
  return groupsStore.groups.filter(
    (group) =>
      group.name.toLowerCase().includes(query) ||
      group.description.toLowerCase().includes(query),
  );
});

const selectedGroup = computed(() => {
  if (!selectedGroupId.value) return null;
  return groupsStore.groups.find((g) => g.group_id === selectedGroupId.value) || null;
});

const availableUsers = computed(() => {
  // Креатор добавляет участников (user), назначение администраторов идёт через
  // владельца группы. Админ может добавлять только обычных пользователей.
  if (!isCreator.value) {
    return usersStore.users.filter((u) => u.role === "user");
  }
  return usersStore.users.filter((u) => u.role === "user" || u.role === "admin");
});

const adminUsers = computed(() =>
  usersStore.users.filter((u) => u.role === "admin"),
);

const ownerNameById = (ownerId: string): string | null => {
  if (!ownerId) return null;
  // Бэкенд не отдаёт админам список других админов, поэтому владельца-админа
  // (часто это сам текущий пользователь) не найти в usersStore. Если владелец —
  // это мы сами, показываем «Вы» по user_id из токена.
  if (ownerId === authStore.userId) return "Вы";
  const owner = usersStore.users.find((u) => u.user_id === ownerId);
  return owner?.full_name ?? null;
};

const adminOwnerOptions = computed(() =>
  adminUsers.value.map((user) => ({
    value: user.user_id,
    label: user.full_name,
  })),
);

const memberSearchQuery = ref("");
const pendingMemberId = ref<string | null>(null);

const roleLabels: Record<string, string> = {
  creator: "Создатель",
  admin: "Администратор",
  user: "Участник",
};

const roleBadgeClass = (role: string): string => {
  switch (role) {
    case "creator":
      return "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300";
    case "admin":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300";
  }
};

const currentMembers = computed(() => groupsStore.activeGroupDetails?.members ?? []);

const candidateUsers = computed(() => {
  const members = currentMembers.value;
  const query = memberSearchQuery.value.trim().toLowerCase();

  return availableUsers.value
    .filter((user) => !members.some((member) => member.user_id === user.user_id))
    .filter((user) => {
      if (!query) return true;
      return (
        user.full_name.toLowerCase().includes(query) ||
        user.position.toLowerCase().includes(query) ||
        user.login.toLowerCase().includes(query)
      );
    });
});

const onAddCandidate = async (userId: string) => {
  if (!userId || pendingMemberId.value) return;
  pendingMemberId.value = userId;
  try {
    await handleAddMember(userId);
  } finally {
    pendingMemberId.value = null;
  }
};

const handleCreateGroup = async () => {
  createError.value = null;

  if (!createForm.value.name.trim()) {
    createError.value = "Укажите название группы";
    return;
  }

  try {
    const ownerId = createForm.value.ownerId.trim();
    await groupsStore.createGroup({
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim(),
      ...(ownerId ? { owner_id: ownerId } : {}),
    });

    showCreateModal.value = false;
    createForm.value = {
      name: "",
      description: "",
      ownerId: "",
    };
  } catch (error) {
    console.error("Failed to create group:", error);
    createError.value = extractApiErrorMessage(error, "Не удалось создать группу");
  }
};

const handleEditGroup = async () => {
  if (!selectedGroupId.value) return;

  editError.value = null;

  if (!editForm.value.name.trim()) {
    editError.value = "Укажите название группы";
    return;
  }

  try {
    await groupsStore.updateGroup(selectedGroupId.value, {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim(),
      // Только креатор может менять владельца. Бэкенд возвращает 403, если
      // админ попытается передать owner_id, поэтому для админа это поле не шлём.
      ...(isCreator.value ? { owner_id: editForm.value.ownerId } : {}),
    });

    showEditModal.value = false;
    selectedGroupId.value = null;
  } catch (error) {
    console.error("Failed to update group:", error);
    editError.value = extractApiErrorMessage(error, "Не удалось обновить группу");
  }
};

const handleDeleteGroup = async () => {
  if (!selectedGroupId.value) return;

  deleteError.value = null;

  try {
    await groupsStore.deleteGroup(selectedGroupId.value);
    showDeleteModal.value = false;
    selectedGroupId.value = null;
  } catch (error) {
    console.error("Failed to delete group:", error);
    deleteError.value = extractApiErrorMessage(error, "Не удалось удалить группу");
  }
};

const handleAddMember = async (userId: string) => {
  if (!selectedGroupId.value) return;

  membersError.value = null;

  try {
    await groupsStore.addMember(selectedGroupId.value, userId);
  } catch (error) {
    console.error("Failed to add member:", error);
    membersError.value = extractApiErrorMessage(error, "Не удалось добавить участника");
  }
};

const handleRemoveMember = async (userId: string) => {
  if (!selectedGroupId.value) return;

  membersError.value = null;

  try {
    await groupsStore.removeMember(selectedGroupId.value, userId);
  } catch (error) {
    console.error("Failed to remove member:", error);
    membersError.value = extractApiErrorMessage(error, "Не удалось удалить участника");
  }
};

const openEditModal = (groupId: string) => {
  const group = groupsStore.groups.find((g) => g.group_id === groupId);
  if (group) {
    selectedGroupId.value = groupId;
    editError.value = null;
    editForm.value = {
      name: group.name,
      description: group.description,
      ownerId: group.owner_id,
    };
    showEditModal.value = true;
  }
};

const openDeleteModal = (groupId: string) => {
  selectedGroupId.value = groupId;
  deleteError.value = null;
  showDeleteModal.value = true;
};

const openMembersModal = async (groupId: string) => {
  selectedGroupId.value = groupId;
  membersError.value = null;
  memberSearchQuery.value = "";
  await groupsStore.fetchGroupMembers(groupId);
  showMembersModal.value = true;
};

onMounted(async () => {
  await groupsStore.fetchGroups({ force: true });
  await usersStore.fetchUsers({ page: 1, limit: 100, force: true });

  // Если передан query-параметр edit — открываем модалку редактирования
  const editGroupId = route.query.edit as string | undefined;
  if (editGroupId) {
    openEditModal(editGroupId);
  }

  // Если передан query-параметр members — открываем модалку участников
  const membersGroupId = route.query.members as string | undefined;
  if (membersGroupId) {
    await openMembersModal(membersGroupId);
  }
});

useAutoRefresh(async () => {
  await groupsStore.fetchGroups({ force: true });
  await usersStore.fetchUsers({
    page: usersStore.currentPage,
    limit: usersStore.currentLimit,
    force: true,
  });
  if (showMembersModal.value && selectedGroupId.value) {
    await groupsStore.fetchGroupMembers(selectedGroupId.value, { force: true });
  }
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-gray-50 dark:bg-dark">
    <Header max-width="max-w-[1800px]" />

    <main class="mx-auto flex w-full min-h-0 max-w-[1800px] flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <!-- Page Header -->
      <div class="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Управление группами</p>
          <h1 class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Группы</h1>
        </div>
        <Button v-if="isCreator" @click="createError = null; showCreateModal = true">
          <Plus :size="18" />
          Создать группу
        </Button>
      </div>

      <!-- Search -->
      <div class="mb-6 shrink-0">
        <div class="relative max-w-xs">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search :size="18" class="text-gray-400" />
          </div>
          <Input v-model="searchQuery" placeholder="Поиск групп..." class="pl-10" />
        </div>
      </div>

      <!-- Scrollable content area -->
      <div class="min-h-0 flex-1 overflow-y-auto pr-1">
        <!-- Groups Grid -->
        <div v-if="groupsStore.isLoading" class="flex items-center justify-center py-12">
          <Spinner size="lg" class="text-blue-600 dark:text-white" />
        </div>

        <div
          v-else-if="filteredGroups.length === 0"
          class="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-dark-border dark:bg-dark-card"
        >
          <p class="text-gray-500 dark:text-gray-400">
            {{ searchQuery ? "Группы не найдены" : "Нет групп" }}
          </p>
        </div>

        <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card
          v-for="group in filteredGroups"
          :key="group.group_id"
          padding="none"
          class="flex flex-col overflow-hidden"
        >
          <!-- Clickable body -->
          <button
            type="button"
            class="flex flex-1 flex-col items-stretch p-5 text-left focus:outline-none"
          >
            <div class="flex items-center gap-4">
              <div
                :class="[
                  'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-xl font-bold ring-1 ring-inset ring-black/5 dark:ring-white/10',
                  groupColorClass(group.group_id),
                ]"
              >
                {{ groupPrefix(group.name) }}
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-base font-semibold text-gray-900 dark:text-white">
                  {{ group.name }}
                </h3>
                <div class="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <Users :size="14" class="flex-shrink-0" />
                  <span>{{ group.member_count ?? 0 }} участников</span>
                </div>
              </div>
            </div>

            <p
              class="mt-4 line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-gray-500 dark:text-gray-400"
            >
              {{ group.description || "Без описания" }}
            </p>

            <div class="mt-auto flex flex-col gap-2 pt-4 text-xs text-gray-500 dark:text-gray-400">
              <div class="flex items-center gap-2">
                <Crown :size="14" class="flex-shrink-0 text-amber-500 dark:text-amber-400" />
                <span class="truncate">
                  {{ ownerNameById(group.owner_id) || "Владелец не назначен" }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <Calendar :size="14" class="flex-shrink-0" />
                <span>Создана {{ formatMeetingDate(group.created_at) }}</span>
              </div>
            </div>
          </button>

          <!-- Actions -->
          <div
            class="flex items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3 dark:border-dark-border dark:bg-white/[0.02]"
          >
            <Button
              variant="primary"
              size="sm"
              class="flex-1"
              @click="openMembersModal(group.group_id)"
            >
              <Users :size="16" />
              Участники
            </Button>
            <Button
              v-if="group.can_edit"
              variant="outline"
              size="sm"
              title="Редактировать"
              class="!px-1.5"
              @click="openEditModal(group.group_id)"
            >
              <Edit :size="16" />
            </Button>
            <Button
              v-if="isCreator && group.can_delete"
              variant="outline"
              size="sm"
              title="Удалить"
              class="!px-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
              @click="openDeleteModal(group.group_id)"
            >
              <Trash2 :size="16" />
            </Button>
          </div>
        </Card>
      </div>
      </div>
    </main>

    <!-- Create Group Modal -->
    <Modal v-model="showCreateModal" title="Создать группу" size="md" :close-on-click-outside="false">
      <form @submit.prevent="handleCreateGroup" class="space-y-4">
        <FormError :message="createError" />
        <div>
          <Input v-model="createForm.name" label="Название" placeholder="Название группы" />
        </div>

        <div>
          <Input v-model="createForm.description" label="Описание" placeholder="Описание группы" />
        </div>

        <div>
          <Select
            v-model="createForm.ownerId"
            label="Владелец (необязательно)"
            :options="adminOwnerOptions"
            placeholder="Назначить позже"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Если не выбрать, владельцем будете считаться вы. Назначить администратора владельцем можно позже в настройках группы.
          </p>
        </div>
      </form>

      <template #footer>
        <Button @click="handleCreateGroup" :is-loading="groupsStore.isMutating">Создать</Button>
      </template>
    </Modal>

    <!-- Edit Group Modal -->
    <Modal v-model="showEditModal" title="Редактировать группу" size="md" :close-on-click-outside="false">
      <form @submit.prevent="handleEditGroup" class="space-y-4">
        <FormError :message="editError" />
        <div>
          <Input v-model="editForm.name" label="Название" />
        </div>

        <div>
          <Input v-model="editForm.description" label="Описание" />
        </div>

        <div v-if="isCreator">
          <Select
            v-model="editForm.ownerId"
            label="Владелец"
            :options="adminOwnerOptions"
            placeholder="Без владельца"
          />
        </div>
      </form>

      <template #footer>
        <Button @click="handleEditGroup" :is-loading="groupsStore.isMutating">Сохранить</Button>
      </template>
    </Modal>

    <!-- Delete Group Modal -->
    <Modal v-model="showDeleteModal" title="Удалить группу?" size="sm">
      <div class="space-y-4">
        <FormError :message="deleteError" />
        <p class="text-gray-700 dark:text-gray-300">
          Вы уверены, что хотите удалить эту группу? Это действие нельзя отменить.
        </p>
      </div>

      <template #footer>
        <Button @click="handleDeleteGroup" :is-loading="groupsStore.isMutating">Удалить</Button>
      </template>
    </Modal>

    <!-- Members Modal -->
    <Modal v-model="showMembersModal" size="lg" :close-on-click-outside="false">
      <template #header>
        <div class="flex min-w-0 items-center gap-3">
          <div
            v-if="selectedGroup"
            :class="[
              'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold ring-1 ring-inset ring-black/5 dark:ring-white/10',
              groupColorClass(selectedGroup.group_id),
            ]"
          >
            {{ groupPrefix(selectedGroup.name) }}
          </div>
          <div class="min-w-0">
            <h3 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
              {{ selectedGroup?.name || "Участники" }}
            </h3>
            <p class="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              <Users :size="13" class="flex-shrink-0" />
              {{ currentMembers.length }} участников
            </p>
          </div>
        </div>
      </template>

      <div v-if="groupsStore.isMembersLoading" class="flex items-center justify-center py-12">
        <Spinner size="md" class="text-blue-600 dark:text-white" />
      </div>

      <div v-else-if="groupsStore.activeGroupDetails" class="space-y-5">
        <FormError :message="membersError" />

        <!-- Add Member Panel -->
        <div
          class="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-dark-border dark:bg-white/[0.02]"
        >
          <div class="mb-3 flex items-center gap-2">
            <UserPlus :size="16" class="text-blue-600 dark:text-white" />
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
              Добавить участника
            </h4>
          </div>

          <div class="relative">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search :size="16" class="text-gray-400" />
            </div>
            <Input
              v-model="memberSearchQuery"
              placeholder="Поиск по имени, должности или логину..."
              hide-label
              class="pl-10"
            />
          </div>

          <div class="mt-3 max-h-52 space-y-1.5 overflow-y-auto pr-1">
            <button
              v-for="user in candidateUsers"
              :key="user.user_id"
              type="button"
              :disabled="pendingMemberId !== null"
              class="cursor-pointer group flex w-full items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors hover:border-gray-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:hover:border-dark-border dark:hover:bg-white/5"
              @click="onAddCandidate(user.user_id)"
            >
              <div
                :class="[
                  'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10',
                  groupColorClass(user.user_id),
                ]"
              >
                {{ getInitials(user.full_name) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {{ user.full_name }}
                </p>
                <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                  {{ user.position || "Без должности" }}
                </p>
              </div>
              <span
                v-if="pendingMemberId === user.user_id"
                class="flex-shrink-0"
              >
                <Spinner size="sm" class="text-blue-600 dark:text-white" />
              </span>
              <span
                v-else
                class="flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-white cursor-pointer"
              >
                <Plus :size="14" />
                Добавить
              </span>
            </button>

            <div
              v-if="candidateUsers.length === 0"
              class="py-6 text-center text-sm text-gray-400 dark:text-gray-500"
            >
              {{ memberSearchQuery ? "Никого не найдено" : "Все доступные пользователи уже в группе" }}
            </div>
          </div>
        </div>

        <!-- Members List -->
        <div>
          <h4 class="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Состав группы
          </h4>

          <div
            v-if="currentMembers.length === 0"
            class="rounded-xl border border-dashed border-gray-200 py-10 text-center dark:border-dark-border"
          >
            <Users :size="28" class="mx-auto text-gray-300 dark:text-gray-600" />
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Пока нет участников</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="member in currentMembers"
              :key="member.user_id"
              class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 transition-colors hover:border-gray-300 dark:border-dark-border dark:hover:border-gray-600"
            >
              <div class="flex min-w-0 items-center gap-3">
                <div
                  :class="[
                    'relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10',
                    groupColorClass(member.user_id),
                  ]"
                >
                  {{ getInitials(member.full_name) }}
                  <span
                    v-if="member.user_id === groupsStore.activeGroupDetails.owner_id"
                    class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/5 dark:bg-dark-card dark:ring-white/10"
                    title="Владелец группы"
                  >
                    <Crown :size="12" class="text-amber-500 dark:text-amber-400" />
                  </span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="truncate font-medium text-gray-900 dark:text-white">
                      {{ member.full_name }}
                    </p>
                    <span
                      :class="[
                        'hidden flex-shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium sm:inline-block',
                        roleBadgeClass(member.role),
                      ]"
                    >
                      {{ roleLabels[member.role] ?? member.role }}
                    </span>
                  </div>
                  <p class="truncate text-sm text-gray-500 dark:text-gray-400">
                    {{ member.position || "Без должности" }}
                  </p>
                </div>
              </div>

              <Button
                v-if="isCreator && member.user_id !== groupsStore.activeGroupDetails.owner_id"
                variant="ghost"
                size="sm"
                title="Удалить из группы"
                class="!px-2 !py-2 flex-shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                @click="handleRemoveMember(member.user_id)"
              >
                <Trash2 :size="16" />
              </Button>
              <span
                v-else-if="member.user_id === groupsStore.activeGroupDetails.owner_id"
                class="flex flex-shrink-0 items-center gap-1 px-2 text-xs font-medium text-amber-600 dark:text-amber-400"
                title="Владельца нельзя удалить"
              >
                <ShieldCheck :size="14" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>
