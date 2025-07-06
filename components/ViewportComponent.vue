<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from "vue";

const props = defineProps<{
  elementRef: HTMLElement | null;
  isMagnifyVisible: boolean;
  zoomFactor: number;
}>();

const emit = defineEmits<{
  (e: "update:zoomFactor", value: number): void;
}>();

// Watch zoomFactor prop for changes in the input slider
function onZoomChange(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("update:zoomFactor", Number(target.value));
}
</script>

<template>
  <div class="relative w-full aspect-video rounded-lg border border-gray-800 bg-neutral-900 overflow-hidden">
    <div
      id="cornerstoneDiv"
      ref="elementRef"
      class="w-full h-full"
    />
    <div v-if="isMagnifyVisible" class="absolute top-3 right-3 z-50 flex flex-col items-center space-y-2">
      <!-- Zoom Canvas -->
      <canvas
        id="zoom-canvas"
        width="150"
        height="150"
        class="w-[150px] h-[150px] border border-white rounded shadow-md bg-black pointer-events-none"
      />
      <div class="flex items-center gap-2 bg-neutral-800 px-2 py-1 rounded">
        <label for="zoomRange" class="text-white text-xs">Zoom:</label>
        <input
          id="zoomRange"
          type="range"
          min="1"
          max="5"
          step="0.1"
          :value="zoomFactor"
          @input="onZoomChange"
          class="w-32 accent-yellow-400"
        />
        <span class="text-yellow-300 text-sm font-mono">{{ zoomFactor.toFixed(1) }}x</span>
      </div>
    </div>
  </div>
</template>
