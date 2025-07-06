import { defineNuxtPlugin } from '#app'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faStepBackward,
  faPlay,
  faPause,
  faStepForward,
} from '@fortawesome/free-solid-svg-icons'

library.add(faStepBackward, faPlay, faPause, faStepForward)

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('FontAwesomeIcon', FontAwesomeIcon)
})
