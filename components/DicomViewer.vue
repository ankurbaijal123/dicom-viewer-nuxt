<template>
  <div class="flex flex-col items-center w-full min-h-screen bg-black text-white font-sans">
    <div class="w-full flex flex-col items-center max-w-5xl p-6">
      <h1 class="text-3xl font-bold mb-4">DICOM Viewer</h1>

      <div class="mb-4">
        <input
          ref="fileInputRef"
          type="file"
          accept=".dcm,application/dicom"
          @change="handleFileChange"
          class="hidden"
        />
        <button
          @click="fileInputRef?.click()"
          class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded mb-2"
        >
          Select DICOM File
        </button>
       <p v-if="currentFile" class="text-sm text-gray-300">
  Loaded: {{ fileName }}
</p>

      </div>

      <!-- Tool Buttons -->
      <div class="flex flex-wrap justify-center gap-3 mb-6">
        <button
          v-for="tool in tools"
          :key="tool.toolName"
          @click="handleToolChange(tool.toolName)"
          class="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded text-sm shadow transition"
        >
          {{ tool.toolName }}
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

      <!-- Action Buttons -->
      <div class="flex flex-wrap justify-center gap-3 mb-4">
        <button
          class="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600 text-sm"
          @click="undo"
        >
          Undo
        </button>
        <button
          class="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600 text-sm"
          @click="redo"
        >
          Redo
        </button>
        <button
          class="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600 text-sm"
          @click="clear"
        >
          Clear
        </button>
        <button
          class="bg-purple-600 px-3 py-1 rounded hover:bg-purple-500 text-sm"
          @click="capture"
        >
          Capture
        </button>
      </div>

      <!-- DICOM Viewport -->
      <ViewportComponent
        :element-ref="elementRef"
        :is-magnify-visible="isMagnifyVisible"
        :zoom-factor="zoomFactor"
        @update-zoom-factor="setZoomFactor"
      />

      <!-- Label Input -->
      <LabelInputOverlay
  :visible="labelInputVisible"
  :coords="labelInputCoords"
  :value="labelInputValue"
  :onChange="setLabelInputValue"
  :onSubmit="onLabelSubmit"
  :onClose="onLabelCancel"
/>


      <!-- Slider & Bookmarks -->
      <div class="relative w-full my-6">
        <input
          type="range"
          :min="0"
          :max="frameCount > 1 ? frameCount - 1 : 0"
          :value="frameCount > 1 ? frameIndex - 1 : 0"
          @input="(e) => handleFrameChange(Number((e.target as HTMLInputElement).value))"

          :disabled="frameCount <= 1"
          :title="frameCount <= 1 ? 'Only available for multi-frame DICOM' : ''"
          class="w-full appearance-none h-2 rounded-full bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed z-10 relative"
        />

        <!-- Bookmarks on slider -->
        <div v-if="bookmarklabel" class="absolute top-1 left-0 w-full h-4 z-[1000] pointer-events-none">
          <div
            v-for="(bookmarkedframe, index) in bookmarkarray"
            :key="index"
            class="absolute"
            :style="{
              left: `${(bookmarkedframe / frameCount) * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }"
          >
            <div class="w-3 h-3 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-md"></div>
          </div>
        </div>

        <!-- Frame Time -->
        <div class="text-sm text-gray-300 mt-2 text-center">
          <template v-if="frameCount > 1">
            {{ String(Math.floor(frameIndex / 30)).padStart(2, '0') }}:
            {{ String(frameIndex % 30).padStart(2, '0') }}
          </template>
          <template v-else>00:00</template>
        </div>
      </div>

      <!-- Playback Controls -->
      <div class="flex flex-wrap justify-center items-center gap-3 mb-3">
        <button
          v-for="btn in playbackButtons"
          :key="btn.label"
          @click="btn.onClick"
          :disabled="frameCount <= 1"
          :title="btn.label"
          class="flex items-center justify-center w-10 h-10 bg-gray-900 border border-gray-700 rounded-md text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition hover:scale-105 active:scale-95"
        >
          <component :is="btn.icon" />
        </button>

        <select
          :disabled="frameCount <= 1"
          :value="speed"
          @input="(e) => handleSpeedChange(Number((e.target as HTMLInputElement).value))"
          class="flex items-center justify-center w-10 h-10 bg-gray-900 border border-gray-700 rounded-md text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
        >
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>

      <!-- Get Annotations -->
      <button
        @click="getMeasurements"
        class="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded text-sm font-semibold transition shadow"
      >
        Get Measurements
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'



import {
  RenderingEngine,
  Enums,
  imageLoader,
  metaData,
  StackViewport,
  init as cornerstoneCoreInit,
} from '@cornerstonejs/core'

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
  LabelTool
} from '@cornerstonejs/tools'

// Components
import ViewportComponent from '~/components/ViewportComponent.vue'
import LabelInputOverlay from '~/components/LabelInputOverlay.vue'
import { faStepBackward, faPlay, faPause, faStepForward } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// Composables
import { useLabelTool } from '~/composables/useLabelTool'
import { useMagnifier } from '~/composables/useMagnifier'
import hardcodedMetaDataProvider from '~/utils/hardcodedMetaDataProvider'

components: {
    FontAwesomeIcon
  }

// Props
interface Props {
  dicomFile?: File | Blob
}

const props = withDefaults(defineProps<Props>(), {
  dicomFile: undefined
})

function setIsMagnifyVisible(val: boolean) {
  isMagnifyVisible.value = val;
}


// Constants
const renderingEngineId = 'myRenderingEngine'
const viewportId = 'myViewport'
const toolGroupId = 'myToolGroup'
const annotationGroupId = 'annotationgroupid'

// Refs
const fileInputRef = ref<HTMLInputElement | null>(null)
const elementRef = ref<HTMLDivElement | null>(null)
const renderingEngineRef = ref<RenderingEngine | null>(null)
const playIntervalRef = ref<NodeJS.Timeout | null>(null)
const rangeref = ref(null)

// State
const loaded = ref(false)
const frameIndex = ref(0)
const frameCount = ref(1)
const currentFile = ref<File | Blob | null>(props.dicomFile || null)
const isPlaying = ref(false)
const isMagnifyVisible = ref(false)
const speed = ref(1)
const cornerstoneElement = ref<any>(null)
const zoomFactor = ref(2)
const imageIds = ref<string[]>([])
const bookmarklabel = ref(false)
const bookmarkarray = ref<number[]>([])
const toolusedonframe = ref<string[]>([])
const activeTool = ref<string | null>(null)
const logs = ref<string[]>([])
const isInitialized = ref(false)

// Undo/Redo stacks
const undostack: any[] = []
const redostack: any[] = []

// Tools configuration
const tools = [
  PanTool,
  ZoomTool,
  LengthTool,
  RectangleROITool,
  EllipticalROITool,
  AngleTool,
  WindowLevelTool,
]



const playbackButtons = computed(() => [
  { icon: faStepBackward, onClick: () => handleFrameChange(frameIndex.value - 1), label: 'Previous Frame' },
  { icon: faPlay, onClick: handlePlay, label: 'Play' },
  { icon: faPause, onClick: handlePause, label: 'Pause' },
  { icon: faStepForward, onClick: () => handleFrameChange(frameIndex.value + 1), label: 'Next Frame' },
])

// Composables
const {
  labelInputVisible,
  labelInputCoords,
  labelInputValue,
  setLabelInputValue,
  onLabelSubmit,
  setLabelInputVisible,
  prevToolRef,
  onLabelCancel,
} = useLabelTool(cornerstoneElement, renderingEngineRef, viewportId, toolGroupId, isMagnifyVisible, setIsMagnifyVisible)

useMagnifier(isMagnifyVisible, elementRef, renderingEngineRef, viewportId, zoomFactor)


const handleFlip = (type: string) => {
  const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport
  
  const { flipVertical, flipHorizontal } = viewport.getCamera()

  viewport.setCamera({
    flipHorizontal: type === 'HFlip' ? !flipHorizontal : flipHorizontal,
    flipVertical: type === 'VFlip' ? !flipVertical : flipVertical,
  })
  viewport.render()
}

const handlePlay = () => {
  if (!isPlaying.value) isPlaying.value = true
}

const handlePause = () => {
  isPlaying.value = false
}

const handleSpeedChange = (num: number) => {
  speed.value = num
}

const handleToolChange = (selectedToolName: string) => {
  prevToolRef.value = selectedToolName
  
  if (['Length', 'RectangleROI', 'EllipticalROI', 'Angle', 'Label'].includes(selectedToolName) && !isMagnifyVisible.value) {
    isMagnifyVisible.value = true
  } else if (isMagnifyVisible.value && ['Pan', 'Zoom', 'WindowLevel'].includes(selectedToolName)) {
    isMagnifyVisible.value = false
  }
  
  const toolGroup = ToolGroupManager.getToolGroup(toolGroupId)
  if (!toolGroup) return
  
  const allTools = [
    PanTool.toolName,
    ZoomTool.toolName,
    WindowLevelTool.toolName,
    LengthTool.toolName,
    RectangleROITool.toolName,
    EllipticalROITool.toolName,
    AngleTool.toolName,
    LabelTool.toolName,
  ]
  
  allTools.forEach((toolName) => {
    if (toolName === selectedToolName) {
      toolGroup.setToolActive(toolName, {
        bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
      })
    } else {
      toolGroup.setToolPassive(toolName)
    }
  })
  
  toolusedonframe.value = toolusedonframe.value.includes(selectedToolName) 
    ? toolusedonframe.value 
    : [...toolusedonframe.value, selectedToolName]
  
  const viewport = renderingEngineRef.value?.getViewport(viewportId)
  viewport?.render()
}

const handleannotation = (evt: any) => {
  const { annotation: ann } = evt.detail
  if (ann.frameIndex === frameIndex.value && toolusedonframe.value.includes(ann.toolName)) {
    bookmarkarray.value = bookmarkarray.value.includes(frameIndex.value) 
      ? bookmarkarray.value 
      : [...bookmarkarray.value, frameIndex.value]
    bookmarklabel.value = true
  }
}

const trackNewAnnotations = () => {
  const annotations = annotation.state.getAllAnnotations()
  annotations.forEach((a) => {
    undostack.push({
      uid: a.annotationUID,
      annotations: a
    })
  })
}

const undo = () => {
  trackNewAnnotations()
  if (undostack.length === 0) return
  const last = undostack.pop()
  annotation.state.removeAnnotation(last.uid)
  redostack.push({
    uid: last.uid,
    ann: last.annotations
  })
  const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport
  viewport.render()
}

const redo = () => {
  if (redostack.length === 0) return
  const lastRedo = redostack.pop()
  annotation.state.addAnnotation(lastRedo.ann, annotationGroupId)
  undostack.push({
    uid: lastRedo.ann.annotationUID,
    annotation: lastRedo.ann,
  })
  const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport
  viewport.render()
}

const clear = () => {
  annotation.state.removeAllAnnotations()
  bookmarkarray.value = []
  const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport
  viewport.render()
}

const capture = () => {
  const element = elementRef.value
  if (!element) return
  
  const canvas = element.querySelector('.cornerstone-canvas') as HTMLCanvasElement
  const svg = element.querySelector('.svg-layer') as SVGSVGElement

  if (!canvas || !svg) {
    console.log('Canvas or SVG annotation layer not found')
    return
  }

  const canvasRect = canvas.getBoundingClientRect()
  const svgRect = svg.getBoundingClientRect()

  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = canvas.width
  exportCanvas.height = canvas.height
  const ctx = exportCanvas.getContext('2d')
  if (!ctx) return

  ctx.drawImage(canvas, 0, 0)

  const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  newSvg.setAttribute('width', String(svgRect.width))
  newSvg.setAttribute('height', String(svgRect.height))
  newSvg.setAttribute('viewBox', `0 0 ${svgRect.width} ${svgRect.height}`)

  Array.from(svg.childNodes).forEach((child) => {
    if (child.nodeType === 1) {
      newSvg.appendChild(child.cloneNode(true))
    }
  })

  const svgData = new XMLSerializer().serializeToString(newSvg)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  const svgImage = new window.Image()

  svgImage.onload = () => {
    const scaleX = canvas.width / canvasRect.width
    const scaleY = canvas.height / canvasRect.height
    const offsetX = (svgRect.left - canvasRect.left) * scaleX
    const offsetY = (svgRect.top - canvasRect.top) * scaleY
    const drawWidth = svgRect.width * scaleX
    const drawHeight = svgRect.height * scaleY
    ctx.drawImage(svgImage, offsetX, offsetY, drawWidth, drawHeight)

    const dataURL = exportCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = dataURL
    link.download = `dicom-capture-frame-${frameIndex.value + 1}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  svgImage.src = url
}

const bookmark = (frameNumber: number) => {
  const bookmarkedindex = frameNumber - 1
  bookmarkarray.value = bookmarkarray.value.includes(bookmarkedindex) 
    ? bookmarkarray.value 
    : [...bookmarkarray.value, bookmarkedindex]
  bookmarklabel.value = true
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    if (file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom') {
      currentFile.value = file
    } else {
      console.log('Please select a valid DICOM (.dcm) file')
    }
  }
}

const handleFrameChange = (index: number) => {
  const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport
  if (index >= 0 && index < frameCount.value) {
    viewport.setImageIdIndex(index)
    viewport.render()
    frameIndex.value = index
  }
}

const getMeasurements = () => {
  const ann = annotation.state.getAllAnnotations()
  console.log(ann)
}

const setZoomFactor = (factor: number) => {
  zoomFactor.value = factor
}



const fileName = computed(() => {
  if (!currentFile.value) return '';
  return currentFile.value instanceof File ? currentFile.value.name : 'DICOM file';
});

// Initialize DICOM from file
const initializeFromFile = async () => {
  if (!currentFile.value) return



  try {
    const { init: dicomLoaderInit, wadouri } = await import('@cornerstonejs/dicom-image-loader')

    await cornerstoneCoreInit()
    await dicomLoaderInit()
    await cornerstoneToolsInit()

    metaData.addProvider(
      (type, imageId) => hardcodedMetaDataProvider(type, imageId, imageId),
      10000
    )

    const element = elementRef.value
    if (!element) return

    const renderingEngine = new RenderingEngine(renderingEngineId)
    renderingEngineRef.value = renderingEngine

    renderingEngine.setViewports([
      {
        viewportId,
        type: Enums.ViewportType.STACK,
        element,
      },
    ])

    const viewport = renderingEngine.getViewport(viewportId) as StackViewport
    const baseImageId = wadouri.fileManager.add(currentFile.value)
    await imageLoader.loadImage(baseImageId)

    const metadata = metaData.get('multiframeModule', baseImageId)
    const numberOfFrames = metadata?.NumberOfFrames || 1
    frameCount.value = numberOfFrames

    const imageIds = Array.from({ length: numberOfFrames }, (_, i) => `${baseImageId}?frame=${i + 1}`)
    await viewport.setStack(imageIds)
    viewport.setImageIdIndex(0)
    viewport.render()

    // Add tools
    tools.forEach(tool => addTool(tool))

    const toolGroup = ToolGroupManager.createToolGroup(toolGroupId)
    if (!toolGroup) return

    tools.forEach((Tool) => {
      toolGroup.addTool(Tool.toolName)
    })
    toolGroup.addViewport(viewportId, renderingEngineId)

    loaded.value = true
  } catch (error) {
    console.error('DICOM load error:', error)
  }
}

// Watchers
watch(currentFile, () => {
  if (currentFile.value) {
    initializeFromFile()
  }
})

watch(isPlaying, () => {
  if (!isPlaying.value) {
    if (playIntervalRef.value) clearInterval(playIntervalRef.value)
    return
  }

  playIntervalRef.value = setInterval(() => {
    if (frameIndex.value + 1 >= frameCount.value) {
      isPlaying.value = false
      frameIndex.value = 0
    } else {
      const nextIndex = frameIndex.value + 1
      const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport

      if (viewport) {
        viewport.setImageIdIndex(nextIndex)
        viewport.render()
      }
      frameIndex.value = nextIndex
    }
  }, (1000 / 30) / speed.value)
})

watch(frameIndex, () => {
  const ann = annotation.state.getAllAnnotations()
  ann.filter((elem) => {
    const imageid = elem.metadata.referencedImageId
    console.log(imageid)

    const frameMatch = imageid?.match(/frame=(\d+)/)
    if (frameMatch) {
      const frameNumber = parseInt(frameMatch[1])
      console.log(frameNumber)
      if (frameNumber) {
        bookmark(frameNumber)
      }
    }
  })
})

// Lifecycle
onMounted(() => {
  const element = document.getElementById('cornerstoneDiv')
  cornerstoneElement.value = element
})

onUnmounted(() => {
  if (playIntervalRef.value) {
    clearInterval(playIntervalRef.value)
  }
})
</script>

<style scoped>
/* Add any custom styles here */
</style>