// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false, // Only client-side rendering

  css: ['@/assets/css/tailwind.css'],

  postcss: {
  plugins: {
    '@tailwindcss/postcss': {}, 
    autoprefixer: {},
  },
},

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
