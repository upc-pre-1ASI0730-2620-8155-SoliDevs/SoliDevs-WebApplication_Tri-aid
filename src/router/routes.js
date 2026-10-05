const soon = () => import('../shared/presentation/views/coming-soon.vue')
import triageClassificationRoutes from '../triage-classification/presentation/triage-classification-routes.js'
import specialtyAssignmentRoutes from '../specialty-assignment/presentation/specialty-assignment-routes.js'
import reportsRoutes from '../reports/presentation/reports-routes.js'

export default [
  { path: '/', redirect: '/login' },
  { path: '/login', component: () => import('../iam/presentation/views/login.vue'), meta: { layout: 'auth' } },
  { path: '/recuperar', component: () => import('../iam/presentation/views/forgot-password.vue'), meta: { layout: 'auth' } },
  { path: '/panel', component: () => import('../panel/presentation/views/panel.vue'), meta: { titleKey: 'nav.panel' } },
  { path: '/patient-registration', component: () => import('../patient-registration/presentation/views/patient-list.vue'), meta: { titleKey: 'nav.patients' } },
  { path: '/patient-registration/new', component: () => import('../patient-registration/presentation/views/registration.vue'), meta: { titleKey: 'rg.title' } },
  { path: '/patient-registration/:episode', component: () => import('../patient-registration/presentation/views/patient-file.vue'), meta: { titleKey: 'pf.title' } },
  { path: '/triage-classification', name: 'triage-classification-bc', children: triageClassificationRoutes },
  { path: '/specialty-assignment', name: 'specialty-assignment-bc', children: specialtyAssignmentRoutes },
  { path: '/alerting', component: () => import('../alerting/presentation/views/alerting-center-view.vue'), meta: { titleKey: 'nav.alerts' } },
  { path: '/reports', name: 'reports-bc', children: reportsRoutes },
  { path: '/devices', component: () => import('../devices/presentation/views/devices-view.vue'), meta: { titleKey: 'nav.devices' } },
  { path: '/subscriptions', component: soon, meta: { titleKey: 'nav.subscription' } }
]