import { createRouter, createWebHistory } from 'vue-router'
import routes, { installGuard } from './routes.js'

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Access control: session (IAM) + subscription state (Subscription).
installGuard(router)

export default router
