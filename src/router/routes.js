const soon = () => import('../shared/presentation/views/coming-soon.vue')

export default [
  { path: '/', redirect: '/login' },
  { path: '/login', component: () => import('../iam/presentation/views/login.vue'), meta: { layout: 'auth' } },
  { path: '/recuperar', component: () => import('../iam/presentation/views/forgot-password.vue'), meta: { layout: 'auth' } },
  { path: '/panel', component: () => import('../panel/presentation/views/panel.vue'), meta: { titleKey: 'nav.panel' } },
  { path: '/patient-registration', component: () => import('../patient-registration/presentation/views/patient-list.vue'), meta: { titleKey: 'nav.patients' } },
  { path: '/patient-registration/new', component: () => import('../patient-registration/presentation/views/registration.vue'), meta: { titleKey: 'rg.title' } },
  { path: '/patient-registration/:episode', component: () => import('../patient-registration/presentation/views/patient-file.vue'), meta: { titleKey: 'pf.title' } },
  { path: '/alerting', component: soon, meta: { titleKey: 'nav.alerts' } },
  { path: '/reports', component: soon, meta: { titleKey: 'nav.reports' } },
  { path: '/devices', component: soon, meta: { titleKey: 'nav.devices' } },
  { path: '/subscriptions', component: soon, meta: { titleKey: 'nav.subscription' } }
]