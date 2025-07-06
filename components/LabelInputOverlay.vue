<script setup lang="ts">
import { computed, defineProps, defineEmits, watch, ref, nextTick } from 'vue';

const props = defineProps<{
  visible: boolean;
  coords: { x: number; y: number };
  value: string;
}>();

const emit = defineEmits<{
  (e: 'update:value', val: string): void;
  (e: 'submit'): void;
  (e: 'close'): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);

// Watch visible prop to autofocus input when it appears
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  }
);

function onChange(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:value', target.value);
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    emit('submit');
  } else if (event.key === 'Escape') {
    emit('close');
  }
}

function onBlur() {
  emit('close');
}
</script>

<template>
  <div
    v-if="visible"
    :style="{
      position: 'fixed',
      top: `${coords.y}px`,
      left: `${coords.x}px`,
      zIndex: 1000
    }"
  >
    <input
      ref="inputRef"
      type="text"
      class="w-48 px-3 py-1 border border-white rounded-md text-yellow-400 placeholder-yellow-300 bg-transparent font-['Roboto'] text-sm focus:outline-none focus:ring-1 focus:ring-white"
      :style="{ color: '#FFFF00' }"
      :value="value"
      placeholder="Enter label and press Enter"
      @input="onChange"
      @keydown="onKeyDown"
      @blur="onBlur"
    />
  </div>
</template>
