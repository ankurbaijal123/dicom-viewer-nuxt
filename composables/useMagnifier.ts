// composables/useMagnifier.ts
import { watch, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';
import type { StackViewport } from '@cornerstonejs/core';

export function useMagnifier(
  isMagnifyVisible: Ref<boolean>,
  elementRef: Ref<HTMLDivElement | null>,
  renderingEngineRef: Ref<any>,
  viewportId: string,
  zoomFactor: Ref<number>
) {
  let handleMouseMove: ((e: MouseEvent) => void) | null = null;

  const cleanup = () => {
    if (elementRef.value && handleMouseMove) {
      elementRef.value.removeEventListener('mousemove', handleMouseMove);
      elementRef.value.style.cursor = '';
    }
  };

  watch(
    [isMagnifyVisible, zoomFactor],
    ([visible]) => {
      cleanup();
      if (!visible) return;

      if (!elementRef.value || !renderingEngineRef.value) return;

      const container = elementRef.value;
      container.style.cursor = 'crosshair';

      const zoomCanvas = document.getElementById('zoom-canvas') as HTMLCanvasElement;
      if (!zoomCanvas) return;

      const zoomCtx = zoomCanvas.getContext('2d');
      if (!zoomCtx) return;

      const zoomCanvasSize = 150;

      handleMouseMove = (e: MouseEvent) => {
        const renderingEngine = renderingEngineRef.value;
        if (!renderingEngine) return;

        const viewport = renderingEngine.getViewport(viewportId) as StackViewport;
        if (!viewport) return;

        const mainCanvas = viewport.getCanvas();
        const mainCtx = mainCanvas.getContext('2d');
        if (!mainCtx) return;

        const zoomHalfSize = zoomCanvasSize / (2 * zoomFactor.value);

        const canvasRect = mainCanvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const canvasX = (e.clientX - canvasRect.left) * dpr;
        const canvasY = (e.clientY - canvasRect.top) * dpr;

        const sx = Math.min(
          Math.max(canvasX - zoomHalfSize, 0),
          mainCanvas.width - 2 * zoomHalfSize
        );
        const sy = Math.min(
          Math.max(canvasY - zoomHalfSize, 0),
          mainCanvas.height - 2 * zoomHalfSize
        );

        const sWidth = 2 * zoomHalfSize;
        const sHeight = 2 * zoomHalfSize;

        zoomCtx.clearRect(0, 0, zoomCanvasSize, zoomCanvasSize);
        zoomCtx.imageSmoothingEnabled = true;
        zoomCtx.imageSmoothingQuality = 'high';
        zoomCtx.drawImage(
          mainCanvas,
          sx,
          sy,
          sWidth,
          sHeight,
          0,
          0,
          zoomCanvasSize,
          zoomCanvasSize
        );
      };

      container.addEventListener('mousemove', handleMouseMove);
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    cleanup();
  });
}
