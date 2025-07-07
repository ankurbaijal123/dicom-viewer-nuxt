import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: false, // Only client-side rendering

  css: ['@/assets/css/tailwind.css', "@fortawesome/fontawesome-svg-core/styles.css"],

  devtools: { enabled: true },
  vite: {
    define: {
      'process.env': {}, // Prevent 'process is not defined' error
      global: {},        // Prevent 'global is not defined' error (Cornerstone3D uses it)
    },
    optimizeDeps: {
      include: [
        '@cornerstonejs/core',
        '@cornerstonejs/tools',
        '@cornerstonejs/dicom-image-loader',
        'dicom-parser',
      ],
    },
     plugins: [
      tailwindcss(),
    ],
  },

  app: {
    head: {
      title: 'DICOM Viewer',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Roboto&display=swap' },
      ],
    },
  },
})
