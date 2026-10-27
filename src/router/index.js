import { createRouter, createWebHistory } from 'vue-router'
import routes, { installGuard } from './routes.js'

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Acceso: sesion (IAM) + estado de suscripcion (Subscription).
installGuard(router)

export default router
