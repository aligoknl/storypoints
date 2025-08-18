<script setup lang="ts">
const props = defineProps<{
  label: string;
  selected?: boolean;
}>();

const emit = defineEmits<{
  (e: "select", value: string): void;
}>();

function handleClick() {
  emit("select", props.label);
}
</script>

<template>
  <button
    type="button"
    class="relative flex items-center justify-center w-16 h-24 rounded-lg shadow-md border transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-tealMid"
    :class="[
      selected
        ? 'bg-brand-teal text-white border-brand-teal'
        : 'bg-white text-brand-gray border-brand-grayLight hover:border-brand-teal hover:text-brand-teal dark:bg-brand-blackish dark:text-gray-200 dark:border-gray-700 dark:hover:border-brand-teal dark:hover:text-brand-teal',
    ]"
    @click="handleClick"
    :aria-pressed="selected"
    :aria-label="`Card value ${label}${selected ? ', selected' : ''}`"
  >
    <span class="text-xl font-bold select-none">{{ label }}</span>
  </button>
</template>

<style scoped>
button:focus-visible {
  outline: none;
}
</style>
