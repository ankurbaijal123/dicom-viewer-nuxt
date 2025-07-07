<script setup lang="ts">
import { ref } from 'vue'
import DicomViewer from '~/components/DicomViewer.vue'  // Adjust the path if needed

const blobState = ref(false)

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    const blob = new Blob([file], { type: file.type })
    blobState.value = true
    console.log('Blob created:', blob)
  }
}
</script>

<template>
  <div class="p-4 space-y-4 text-white">
    {!file && <input type="file" @change="handleFileChange" class="bg-gray-800 p-2 rounded" />}
    
    <!-- You can conditionally render the viewer based on upload -->
    <DicomViewer v-if="blobState" />
  </div>
</template>


