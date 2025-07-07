import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

// Import specific icons you want to use:
import { faPlay, faPause, faStepBackward, faStepForward } from "@fortawesome/free-solid-svg-icons";

library.add(faPlay, faPause, faStepBackward, faStepForward);

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component("FontAwesomeIcon", FontAwesomeIcon);
});
