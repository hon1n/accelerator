<script setup lang="ts">
defineProps<{
  isLoading?: boolean;
  disabled?: boolean;
}>();
</script>

<template>
  <button
    :disabled="isLoading || disabled"
    class="bg-primary hover:bg-primary/75 focus:ring-primary flex w-full items-center justify-center rounded-xl px-3.5 py-3.5 text-sm font-medium text-white transition-colors hover:cursor-pointer focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
  >
    <span v-if="isLoading" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
    <slot></slot>
  </button>
</template>
