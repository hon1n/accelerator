<script setup lang="ts">
import { computed, ref, useAttrs } from "vue";
import { Eye, EyeOff } from "@lucide/vue";
import {
  fieldControlClass,
  fieldControlSizeClass,
  fieldLabelClass,
  fieldWrapperClass,
} from "./fieldStyles";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    type?: "text" | "password" | "email" | "date" | "number";
    placeholder?: string;
    maxlength?: string | number;
    disabled?: boolean;
    error?: boolean;
    hideLabel?: boolean;
  }>(),
  {
    type: "text",
    disabled: false,
    error: false,
    hideLabel: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "input", event: Event): void;
}>();

const attrs = useAttrs();

const isPassword = computed(() => props.type === "password");
const showPassword = ref(false);

const resolvedType = computed(() => {
  if (isPassword.value) {
    return showPassword.value ? "text" : "password";
  }
  return props.type;
});

const wrapperClass = computed(() =>
  props.label && !props.hideLabel ? fieldWrapperClass : "flex w-full flex-col",
);

const inputClass = computed(() => {
  const extra = typeof attrs.class === "string" ? attrs.class : "";
  return [
    fieldControlClass({ error: props.error, disabled: props.disabled }),
    fieldControlSizeClass,
    isPassword.value ? "pr-11" : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
});

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.value);
  emit("input", event);
};
</script>

<template>
  <div :class="wrapperClass">
    <label v-if="label && !hideLabel" :class="fieldLabelClass">
      {{ label }}
    </label>
    <div :class="isPassword ? 'relative w-full' : 'contents'">
      <input
        :type="resolvedType"
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :disabled="disabled"
        :class="inputClass"
        v-bind="{ ...attrs, class: undefined }"
        @input="handleInput"
      />
      <button
        v-if="isPassword"
        type="button"
        tabindex="-1"
        :disabled="disabled"
        :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'"
        class="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300"
        @click="togglePassword"
      >
        <EyeOff v-if="showPassword" :size="18" />
        <Eye v-else :size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Скрываем нативные иконки браузера, чтобы не дублировать собственную кнопку. */
input[type="password"]::-ms-reveal,
input[type="password"]::-ms-clear {
  display: none;
}
</style>
