import { createApp } from 'vue'
import './style.css'
import App from './app.vue'

import PrimeVue from 'primevue/config';
import Material from '@primeuix/themes/material';
import 'primeflex/primeflex.css';
import 'primeicons/primeicons.css';
const app = createApp(App);


app.use(PrimeVue, {
    theme: {
        preset: Material,
        options: {
            darkModeSelector: '.my-app-dark'
        }
    }
});

createApp(App).mount('#app')
