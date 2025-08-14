// src/main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import Aura from "@primevue/themes/aura";
import App from "./App.vue";
import { ensureAnonAuth } from "./lib/firebase";
import "primeicons/primeicons.css";
import "./assets/tailwind.css";

const app = createApp(App);
app.use(createPinia());
app.use(PrimeVue, { ripple: true, theme: { preset: Aura } });
app.use(ToastService);
app.use(router);

ensureAnonAuth().then(() => app.mount("#app"));
