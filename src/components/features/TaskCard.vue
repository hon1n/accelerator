<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { FileAudio, CheckCircle2, AlertCircle, Loader2 } from "@lucide/vue";
import Card from "../ui/Card.vue";
import Badge from "../ui/Badge.vue";
import type { TaskListItem } from "../../types/tasks";

interface Props {
  task: TaskListItem;
}

const props = defineProps<Props>();
const router = useRouter();

const statusConfig = computed(() => {
  switch (props.task.status) {
    case "done":
      return {
        label: "ГОТОВО",
        variant: "success" as const,
        icon: CheckCircle2,
      };
    case "processing_transcribe":
    case "processing_summary":
      return {
        label: "В ПРОЦЕССЕ",
        variant: "warning" as const,
        icon: Loader2,
      };
    case "error":
      return {
        label: "ОШИБКА",
        variant: "error" as const,
        icon: AlertCircle,
      };
    default:
      return {
        label: "НЕИЗВЕСТНО",
        variant: "default" as const,
        icon: AlertCircle,
      };
  }
});

const formattedDuration = computed(() => {
  const seconds = props.task.duration_seconds || 0;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} мин`;
});

const handleClick = () => {
  if (props.task.status === "done") {
    router.push({ name: "RecordDetails", params: { id: props.task.task_id } });
  } else if (
    props.task.status === "processing_transcribe" ||
    props.task.status === "processing_summary"
  ) {
    router.push({ name: "RecordProcessingDetails", params: { id: props.task.task_id } });
  }
};
</script>

<template>
  <Card
    padding="none"
    :hover="task.status !== 'error'"
    :class="[
      'cursor-pointer overflow-hidden transition-all',
      {
        'cursor-not-allowed opacity-60': task.status === 'error',
      },
    ]"
    @click="handleClick"
  >
    <div class="flex items-start gap-4 p-4">
      <div
        :class="[
          'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg',
          {
            'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400':
              task.status === 'done',
            'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400':
              task.status === 'processing_transcribe' || task.status === 'processing_summary',
            'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400':
              task.status === 'error',
          },
        ]"
      >
        <component :is="statusConfig.icon" :size="24" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <h3
              class="truncate text-base font-semibold text-gray-900 dark:text-white"
            >
              {{ task.task_name }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ task.meeting_date }} • {{ formattedDuration }}
            </p>
          </div>

          <Badge :variant="statusConfig.variant" size="sm">
            {{ statusConfig.label }}
          </Badge>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div class="flex items-center gap-1.5">
            <FileAudio :size="14" />
            <span>{{ task.original_filename }}</span>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
