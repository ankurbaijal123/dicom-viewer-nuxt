<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import {
  RenderingEngine,
  Enums,
  imageLoader,
  metaData,
  StackViewport,
  init as cornerstoneCoreInit,
} from "@cornerstonejs/core";

import {
  init as cornerstoneToolsInit,
  ToolGroupManager,
  Enums as csToolsEnums,
  addTool,
  PanTool,
  ZoomTool,
  WindowLevelTool,
  LengthTool,
  RectangleROITool,
  EllipticalROITool,
  AngleTool,
  annotation,
  LabelTool,
} from "@cornerstonejs/tools";

import hardcodedMetaDataProvider from "@/utils/hardcodedMetaDataProvider";
import {useLabelTool} from "@/composables/useLabelTool";
import {useMagnifier} from "@/composables/useMagnifier";
import ViewportComponent from "~/components/ViewportComponent.vue";
import LabelInputOverlay from "~/components/LabelInputOverlay.vue";

const renderingEngineId = "myRenderingEngine";
const viewportId = "myViewport";
const toolGroupId = "myToolGroup";

// Refs and reactive state
const elementRef = ref<HTMLDivElement | null>(null);
const loaded = ref(false);
const renderingEngineRef = ref<RenderingEngine | null>(null);
const frameIndex = ref(0);
const frameCount = ref(1);
const isPlaying = ref(false);
const isMagnifyVisible = ref(false);
const speed = ref(1);
const playIntervalRef = ref<NodeJS.Timeout | null>(null);
const cornerstoneElement = ref<HTMLElement | null>(null);
const zoomFactor = ref(2);

const setIsMagnifyVisible = (val: boolean) => {
  isMagnifyVisible.value = val;
};


// Set cornerstoneElement after mount
onMounted(() => {
  cornerstoneElement.value = document.getElementById("cornerstoneDiv");
});

const fetchDicomFile = async () => {
  const response = await fetch("/dicom_1.dcm");
  console.log("Fetching DICOM file status:", response.status);
  if (!response.ok) throw new Error("Failed to fetch DICOM file");
  return await response.blob();
};


const handleFlip = (type: "HFlip" | "VFlip") => {
  const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport;
  if (!viewport) return;

  const { flipVertical, flipHorizontal } = viewport.getCamera();

  viewport.setCamera({
    flipHorizontal: type === "HFlip" ? !flipHorizontal : flipHorizontal,
    flipVertical: type === "VFlip" ? !flipVertical : flipVertical,
  });
  viewport.render();
};

// Initialize cornerstone and tools
onMounted(async () => {
  try {
    const { init: dicomLoaderInit, wadouri } = await import("@cornerstonejs/dicom-image-loader");
    await cornerstoneCoreInit();
    await dicomLoaderInit();
    await cornerstoneToolsInit();

    metaData.addProvider(
      (type, imageId) => hardcodedMetaDataProvider(type, imageId, imageId),
      10000
    );

    if (!elementRef.value) return;
    const element = elementRef.value;
    const renderingEngine = new RenderingEngine(renderingEngineId);
    renderingEngineRef.value = renderingEngine;

    renderingEngine.setViewports([
      {
        viewportId,
        type: Enums.ViewportType.STACK,
        element,
      },
    ]);

    const viewport = renderingEngine.getViewport(viewportId) as StackViewport;
    const imageBlob = await fetchDicomFile();
    console.log("Fetched DICOM file:", imageBlob);
    const baseImageId = wadouri.fileManager.add(imageBlob);

    await imageLoader.loadImage(baseImageId);

    const metadata = metaData.get("multiframeModule", baseImageId);
    const numberOfFrames = metadata?.NumberOfFrames;

    if (numberOfFrames) {
      frameCount.value = numberOfFrames;

      const imageIds = [];
      for (let i = 0; i < numberOfFrames; i++) {
        imageIds.push(`${baseImageId}?frame=${i + 1}`);
      }

      await viewport.setStack(imageIds);
      viewport.setImageIdIndex(0); // start at first frame
    } else {
      await viewport.setStack([baseImageId]);
    }

    viewport.render();

    [
      PanTool,
      ZoomTool,
      WindowLevelTool,
      LengthTool,
      RectangleROITool,
      EllipticalROITool,
      AngleTool,
      LabelTool,
    ].forEach(addTool);

    const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
    if (!toolGroup) return;

    [
      PanTool,
      ZoomTool,
      WindowLevelTool,
      LengthTool,
      RectangleROITool,
      EllipticalROITool,
      AngleTool,
      LabelTool,
    ].forEach((Tool) => {
      toolGroup.addTool(Tool.toolName);
    });

    toolGroup.addViewport(viewportId, renderingEngineId);

    loaded.value = true;
  } catch (error) {
    console.error("Initialization error:", error);
    alert("Runtime Error:\n" + JSON.stringify(error, null, 2));
  }
});

watch(isPlaying, (newVal) => {
  if (!newVal) {
    if (playIntervalRef.value) clearInterval(playIntervalRef.value);
    return;
  }

  playIntervalRef.value = setInterval(() => {
    frameIndex.value = (prevIndex => {
      if (prevIndex + 1 >= frameCount.value) {
        isPlaying.value = false;
        return 0;
      }
      const nextIndex = prevIndex + 1;
      const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport;
      if (viewport) {
        viewport.setImageIdIndex(nextIndex);
        viewport.render();
      }
      return nextIndex;
    })(frameIndex.value);
  }, (1000 / 30) / speed.value);
});

onBeforeUnmount(() => {
  if (playIntervalRef.value) clearInterval(playIntervalRef.value);
});

const handlePlay = () => {
  if (!isPlaying.value) isPlaying.value = true;
};

const handlePause = () => {
  isPlaying.value = false;
};

const handleSpeedChange = (num: number) => {
  speed.value = num;
};

const handleToolChange = (selectedToolName: string) => {
  prevTool.value = selectedToolName;
  if (isMagnifyVisible.value) {
    isMagnifyVisible.value = false;
  }
  const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
  if (!toolGroup) return;

  const allTools = [
    PanTool.toolName,
    ZoomTool.toolName,
    WindowLevelTool.toolName,
    LengthTool.toolName,
    RectangleROITool.toolName,
    EllipticalROITool.toolName,
    AngleTool.toolName,
    LabelTool.toolName,
  ];

  allTools.forEach((toolName) => {
    if (toolName === selectedToolName) {
      toolGroup.setToolActive(toolName, {
        bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
      });
    } else {
      toolGroup.setToolPassive(toolName);
    }
  });

  const viewport = renderingEngineRef.value?.getViewport(viewportId);
  viewport?.render();
};

const handleFrameChange = (index: number) => {
  const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport;
  if (index >= 0 && index < frameCount.value && viewport) {
    viewport.setImageIdIndex(index);
    viewport.render();
    frameIndex.value = index;
  }
};

const {
  labelInputVisible,
  labelInputCoords,
  labelInputValue,
  setLabelInputValue,
  onLabelSubmit,
  setLabelInputVisible,
  prevTool,
  onLabelCancel,
} = useLabelTool(cornerstoneElement, renderingEngineRef, viewportId, toolGroupId, isMagnifyVisible, setIsMagnifyVisible);

useMagnifier(isMagnifyVisible, elementRef, renderingEngineRef, viewportId, zoomFactor);
</script>

<template>
  <div class="flex flex-col items-center w-full min-h-screen bg-black text-white font-sans">
    <div class="w-full flex flex-col items-center max-w-5xl p-6">
      <h1 class="text-3xl font-bold mb-4">DICOM Viewer</h1>

      <div class="flex flex-wrap justify-center gap-3 mb-6">
        <button
          v-for="Tool in [PanTool, ZoomTool, LengthTool, RectangleROITool, EllipticalROITool, AngleTool, WindowLevelTool]"
          :key="Tool.toolName"
          @click="handleToolChange(Tool.toolName)"
          class="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded text-sm shadow transition"
        >
          {{ Tool.toolName }}
        </button>

        <button
          @click="isMagnifyVisible = true"
          class="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded text-sm shadow transition"
        >
          Pan Zoom
        </button>

        <button
          @click="handleFlip('VFlip')"
          class="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded text-sm shadow transition"
        >
          V Flip
        </button>

        <button
          @click="handleFlip('HFlip')"
          class="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded text-sm shadow transition"
        >
          H Flip
        </button>
      </div>

      <ViewportComponent
        :elementRef="elementRef"
        :isMagnifyVisible="isMagnifyVisible"
        :zoomFactor="zoomFactor"
        @update:zoomFactor="zoomFactor = $event"
      />

      <LabelInputOverlay
        :visible="labelInputVisible"
        :coords="labelInputCoords"
        :value="labelInputValue"
        @update:value="setLabelInputValue"
        @submit="onLabelSubmit"
        @close="onLabelCancel"
      />

      <div class="relative w-full my-6">
        <input
          type="range"
          :min="0"
          :max="frameCount > 1 ? frameCount - 1 : 0"
          :value="frameIndex"
          @input="handleFrameChange(Number($event.target.value))"
          :disabled="frameCount <= 1"
          :title="frameCount <= 1 ? 'Only available for multi-frame DICOM' : ''"
          class="w-full appearance-none h-2 rounded-full bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <div class="text-sm text-gray-300">
          <template v-if="frameCount > 1">
            {{ ('00' + Math.floor(frameIndex / 30)).slice(-2) }}:{{ ('00' + (frameIndex % 30)).slice(-2) }}
          </template>
          <template v-else>00:00</template>
        </div>
      </div>

      <div class="flex flex-wrap justify-center items-center gap-3 mb-3">
        <button
          @click="handleFrameChange(frameIndex - 1)"
          :disabled="frameCount <= 1"
          title="Previous Frame"
          class="flex items-center justify-center w-10 h-10 bg-gray-900 border border-gray-700 rounded-md text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition hover:scale-105 active:scale-95"
        >
         
          <FontAwesomeIcon icon="step-backward" />
        </button>
        <button
          @click="handlePlay"
          :disabled="frameCount <= 1"
          title="Play"
          class="flex items-center justify-center w-10 h-10 bg-gray-900 border border-gray-700 rounded-md text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition hover:scale-105 active:scale-95"
        >
        <FontAwesomeIcon icon="play" />
        </button>
        <button
          @click="handlePause"
          :disabled="frameCount <= 1"
          title="Pause"
          class="flex items-center justify-center w-10 h-10 bg-gray-900 border border-gray-700 rounded-md text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition hover:scale-105 active:scale-95"
        >

           <FontAwesomeIcon icon="pause" />
        </button>
        <button
          @click="handleFrameChange(frameIndex + 1)"
          :disabled="frameCount <= 1"
          title="Next Frame"
          class="flex items-center justify-center w-10 h-10 bg-gray-900 border border-gray-700 rounded-md text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition hover:scale-105 active:scale-95"
        >
          <FontAwesomeIcon icon="step-forward" />
        </button>

        <select
          :disabled="frameCount <= 1"
          v-model.number="speed"
          class="flex items-center justify-center w-15 h-10 bg-gray-900 border border-gray-700 rounded-md text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
        >
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>

      <button
        @click="() => {
          const ann = annotation.state.getAllAnnotations();
          console.log(ann);
        }"
        class="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded text-sm font-semibold transition shadow"
      >
        Get Measurements
      </button>
    </div>
  </div>
</template>
