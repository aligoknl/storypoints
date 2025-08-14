<script setup lang="ts">
const props = defineProps<{
  label: string;
  selected?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "select", value: string): void;
}>();

function handleClick() {
  if (!props.disabled) emit("select", props.label);
}
</script>

<template>
  <button
    type="button"
    class="relative flex items-center justify-center w-16 h-24 rounded-lg shadow-md border transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-tealMid"
    :class="[
      selected
        ? 'bg-brand-teal text-white border-brand-teal'
        : 'bg-white text-brand-gray border-brand-grayLight hover:border-brand-teal hover:text-brand-teal',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
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
