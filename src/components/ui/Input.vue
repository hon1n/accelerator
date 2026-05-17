<script setup lang="ts">
defineProps<{
  modelValue: string;
  label?: string;
  onInput?: (e: Event) => void;
  type?: "text" | "password" | "email";
  placeholder?: string;
}>();

defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();
</script>

<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" class="text-sm font-medium text-gray-700 transition-colors dark:text-gray-300">
      {{ label }}
    </label>
    <input
      :type="type"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :placeholder="placeholder"
      class="focus:ring-primary rounded-xl border border-gray-200 px-3.5 py-3.5 text-sm transition-all placeholder:text-[#A8A9AC] focus:border-transparent focus:ring-2 focus:outline-none dark:border-[#FFFFFF10] dark:bg-black/20 dark:hover:border-[#FFFFFF20]"
    />
  </div>
</template>
