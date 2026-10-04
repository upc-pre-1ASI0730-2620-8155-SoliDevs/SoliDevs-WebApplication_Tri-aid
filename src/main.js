import { createApp } from 'vue'
import './style.css'
import App from './app.vue'
import router from './router/index.js'
import { i18n } from './shared/application/i18n.js'

import PrimeVue from 'primevue/config'
import Material from '@primeuix/themes/material'
import ConfirmationService from "primevue/confirmationservice";
import ConfirmDialog from 'primevue/confirmdialog'
import 'primeflex/primeflex.css'
import 'primeicons/primeicons.css'

const app = createApp(App)

app.use(router)
app.use(i18n)
app.use(PrimeVue, {
    theme: {
        preset: Material,
        options: {
            darkModeSelector: '.my-app-dark'
        }
    }
})

app.use(ConfirmationService)
app.component('ConfirmDialog', ConfirmDialog);

router.isReady().then(() => app.mount('#app'))

// Oculta el badge "Invalid PrimeUI License"
const style = document.createElement('style')
style.textContent = '#p-license-host { display: none !important; }'
document.head.appendChild(style)