// composables/useLabelTool.ts
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import {
  annotation,
  LabelTool,
  ToolGroupManager,
  Enums as csToolsEnums,
} from '@cornerstonejs/tools';
import type { StackViewport } from '@cornerstonejs/core';

export function useLabelTool(
  cornerstoneElement: Ref<HTMLElement | null>,
  renderingEngineRef: Ref<any>,
  viewportId: string,
  toolGroupId: string,
  isMagnifyVisible: Ref<boolean>,
  setIsMagnifyVisible: (visible: boolean) => void
) {
  const labelInputVisible = ref(false);
  const labelInputCoords = ref({ x: 0, y: 0 });
  const labelInputValue = ref('');
  const currentWorldPos = ref<number[] | null>(null);
  const currentImageId = ref<string | null>(null);



const prevTool = ref<string | null>(null);

  // Handler function ref so we can add/remove event listener
  let handler: ((event: MouseEvent) => void) | null = null;

  const addDoubleClickListener = () => {
    if (!cornerstoneElement.value) return;

    handler = (event: MouseEvent) => {
      const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
      const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport;
      if (!viewport || !toolGroup) return;

      if (isMagnifyVisible.value) {
        prevTool.value = 'Magnifier';
        setIsMagnifyVisible(false);
      }

      const canvas = viewport.getCanvas();
      const rect = canvas.getBoundingClientRect();

      const coords: [number, number] = [
        event.clientX - rect.left,
        event.clientY - rect.top,
      ];

      const worldPos = viewport.canvasToWorld(coords);
      const imageId = viewport.getCurrentImageId();

      currentWorldPos.value = worldPos;
      currentImageId.value = imageId;

      labelInputCoords.value = { x: event.clientX, y: event.clientY };
      labelInputValue.value = '';
      labelInputVisible.value = true;
    };

    cornerstoneElement.value.addEventListener('dblclick', handler);
  };

  const removeDoubleClickListener = () => {
    if (cornerstoneElement.value && handler) {
      cornerstoneElement.value.removeEventListener('dblclick', handler);
    }
  };

  onMounted(() => {
    addDoubleClickListener();
  });

  onBeforeUnmount(() => {
    removeDoubleClickListener();
  });

  // Also watch cornerstoneElement in case it changes dynamically
  watch(cornerstoneElement, (newVal, oldVal) => {
    if (oldVal) oldVal.removeEventListener('dblclick', handler!);
    if (newVal) newVal.addEventListener('dblclick', handler!);
  });

  function onLabelSubmit() {
    const worldPos = currentWorldPos.value;
    const imageId = currentImageId.value;
    const viewport = renderingEngineRef.value?.getViewport(viewportId);
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);

    if (!labelInputValue.value || !imageId || !worldPos || !viewport || !toolGroup) return;

    annotation.state.addAnnotation(
      {
        metadata: {
          toolName: LabelTool.toolName,
          viewPlaneNormal: viewport.getCamera().viewPlaneNormal,
          viewUp: viewport.getCamera().viewUp,
          referencedImageId: imageId,
        },
        data: {
          text: labelInputValue.value,
          handles: {
            points: [worldPos as any],
            activeHandleIndex: null,
          },
        },
      },
      LabelTool.toolName
    );

    toolGroup.setToolActive(LabelTool.toolName, {
      bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
    });

    toolGroup.setToolPassive(LabelTool.toolName);

    if (prevTool.value === 'Magnifier') {
      setIsMagnifyVisible(true);
    } else {
      const previousTool = prevTool.value;
      if (previousTool && previousTool !== LabelTool.toolName) {
        toolGroup.setToolActive(previousTool, {
          bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
        });
      }
    }

    viewport.render();
    labelInputVisible.value = false;
    labelInputValue.value = '';
    prevTool.value = null;
  }

  function onLabelCancel() {
    if (prevTool.value === 'Magnifier') {
      setIsMagnifyVisible(true);
    }

    labelInputVisible.value = false;
    prevTool.value = null;
  }

  return {
    labelInputVisible,
    labelInputCoords,
    labelInputValue,
    setLabelInputValue: (val: string) => (labelInputValue.value = val),
    onLabelSubmit,
    onLabelCancel,
    setLabelInputVisible: (val: boolean) => (labelInputVisible.value = val),
    prevTool,
  };
}
