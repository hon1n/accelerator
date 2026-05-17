<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { ChevronDown, Check } from "@lucide/vue";

const props = defineProps<{
  modelValue: string;
  label?: string;
  options: string[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const selectOption = (option: string) => {
  emit("update:modelValue", option);
  isOpen.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="flex flex-col gap-2" ref="dropdownRef">
    <label v-if="label" class="text-sm font-medium text-gray-700 transition-colors dark:text-gray-300">
      {{ label }}
    </label>

    <div class="relative">
      <button
        type="button"
        @click="isOpen = !isOpen"
        :class="[
          'flex w-full items-center justify-between rounded-xl border bg-white px-3.5 py-3.5 text-sm transition-colors focus:ring-1 focus:outline-none',
          isOpen ? 'border-blue-500 ring-blue-500 dark:border-blue-500' : 'border-gray-200 hover:border-gray-300 dark:border-[#FFFFFF10] dark:hover:border-[#FFFFFF20]',
          'dark:bg-black/20 dark:text-white',
        ]"
      >
        <span class="truncate">{{ modelValue || "Выберите..." }}</span>
        <ChevronDown class="h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400" :class="{ 'rotate-180': isOpen }" />
      </button>

      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div v-if="isOpen" class="absolute z-50 mt-1.5 w-full rounded-lg border border-gray-100 bg-white p-1.5 shadow-sm dark:border-[#FFFFFF10] dark:bg-gray-900">
          <div class="custom-scrollbar max-h-60 overflow-y-auto">
            <button
              v-for="option in options"
              :key="option"
              type="button"
              @click="selectOption(option)"
              :class="[
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors cursor-pointer',
                option === modelValue
                  ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5',
              ]"
            >
              <span class="truncate">{{ option }}</span>
              <Check v-if="option === modelValue" class="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>
