<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useAttrs, watch, nextTick } from "vue";
import { ChevronDown, Check } from "@lucide/vue";
import {
  fieldControlClass,
  fieldControlSizeClass,
  fieldLabelClass,
  fieldSelectMenuClass,
  fieldSelectMenuScrollClass,
  fieldSelectOptionClass,
  fieldWrapperClass,
} from "./fieldStyles";

defineOptions({ inheritAttrs: false });

interface Option {
  value: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    options: (string | Option)[];
    disabled?: boolean;
    error?: boolean;
    placeholder?: string;
    hideLabel?: boolean;
  }>(),
  {
    disabled: false,
    error: false,
    placeholder: "Выберите...",
    hideLabel: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const attrs = useAttrs();

const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);

const MENU_MAX_HEIGHT = 240; // соответствует max-h-60 (15rem)
const MARGIN = 8;

const menuStyle = ref<{
  top: string;
  left: string;
  width: string;
  maxHeight: string;
}>({
  top: "0px",
  left: "0px",
  width: "0px",
  maxHeight: `${MENU_MAX_HEIGHT}px`,
});

const wrapperClass = computed(() => {
  const extra = typeof attrs.class === "string" ? attrs.class : "";
  const base = props.label && !props.hideLabel ? fieldWrapperClass : "flex w-full flex-col";
  return [base, extra].filter(Boolean).join(" ");
});

const normalizedOptions = computed(() =>
  props.options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  ),
);

const selectedLabel = computed(() => {
  const option = normalizedOptions.value.find((opt) => opt.value === props.modelValue);
  return option?.label ?? props.placeholder;
});

const isPlaceholder = computed(
  () => !normalizedOptions.value.some((opt) => opt.value === props.modelValue),
);

const triggerClass = computed(() =>
  [
    fieldControlClass({ error: props.error, disabled: props.disabled }),
    fieldControlSizeClass,
    "flex items-center justify-between gap-2 text-left",
    !props.disabled ? "cursor-pointer" : "",
    isPlaceholder.value ? "text-gray-400 dark:text-gray-500" : "",
  ]
    .filter(Boolean)
    .join(" "),
);

const selectOption = (value: string) => {
  emit("update:modelValue", value);
  isOpen.value = false;
};

const toggleOpen = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    void nextTick(updateMenuPosition);
  }
};

function updateMenuPosition() {
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  const spaceBelow = viewportHeight - rect.bottom - MARGIN;
  const spaceAbove = rect.top - MARGIN;

  let top: number;
  let maxHeight: number;

  // Открываем вниз если есть достаточно места, иначе вверх.
  if (spaceBelow >= Math.min(MENU_MAX_HEIGHT, 160) || spaceBelow >= spaceAbove) {
    top = rect.bottom + MARGIN;
    maxHeight = Math.max(120, Math.min(MENU_MAX_HEIGHT, spaceBelow));
  } else {
    maxHeight = Math.max(120, Math.min(MENU_MAX_HEIGHT, spaceAbove));
    top = rect.top - MARGIN - maxHeight;
  }

  let left = rect.left;
  const width = rect.width;
  if (left + width + MARGIN > viewportWidth) {
    left = Math.max(MARGIN, viewportWidth - width - MARGIN);
  }
  if (left < MARGIN) left = MARGIN;

  menuStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`,
  };
}

const handleViewportChange = () => {
  if (isOpen.value) updateMenuPosition();
};

watch(isOpen, (open) => {
  if (open) {
    void nextTick(updateMenuPosition);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
  } else {
    window.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("resize", handleViewportChange);
  }
});

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  const insideRoot = rootRef.value?.contains(target);
  const insideMenu = menuRef.value?.contains(target);
  if (!insideRoot && !insideMenu) {
    isOpen.value = false;
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && isOpen.value) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("scroll", handleViewportChange, true);
  window.removeEventListener("resize", handleViewportChange);
});
</script>

<template>
  <div ref="rootRef" :class="wrapperClass">
    <label v-if="label && !hideLabel" :class="fieldLabelClass">
      {{ label }}
    </label>

    <div class="relative w-full">
      <button
        ref="triggerRef"
        type="button"
        :disabled="disabled"
        :class="triggerClass"
        @click="toggleOpen"
      >
        <span class="min-w-0 flex-1 truncate">{{ selectedLabel }}</span>
        <ChevronDown
          :size="16"
          class="shrink-0 text-gray-400 transition-transform dark:text-gray-500"
          :class="{ 'rotate-180': isOpen }"
        />
      </button>

      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="-translate-y-1 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="-translate-y-1 opacity-0"
        >
          <div
            v-if="isOpen && !disabled"
            ref="menuRef"
            :class="fieldSelectMenuClass"
            :style="{
              position: 'fixed',
              top: menuStyle.top,
              left: menuStyle.left,
              width: menuStyle.width,
              margin: 0,
              zIndex: 100,
            }"
          >
            <div
              :class="fieldSelectMenuScrollClass"
              :style="{ maxHeight: menuStyle.maxHeight }"
            >
              <template v-if="normalizedOptions.length > 0">
                <button
                  v-for="option in normalizedOptions"
                  :key="option.value"
                  type="button"
                  :class="[
                    fieldSelectOptionClass,
                    option.value === modelValue
                      ? 'bg-blue-50 font-medium text-blue-600 dark:bg-white/10 dark:text-white'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5',
                  ]"
                  @click="selectOption(option.value)"
                >
                  <span class="truncate">{{ option.label }}</span>
                  <Check
                    v-if="option.value === modelValue"
                    :size="16"
                    class="ml-2 shrink-0"
                  />
                </button>
              </template>
              <div
                v-else
                class="px-3.5 py-2.5 text-center text-sm text-gray-400 dark:text-gray-500"
              >
                Список пуст
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>
