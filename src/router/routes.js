const soon = () => import('../shared/presentation/views/coming-soon.vue')

export default [
  { path: '/', redirect: '/login' },
  { path: '/login', component: () => import('../iam/presentation/views/login.vue'), meta: { layout: 'auth' } },
  { path: '/recuperar', component: () => import('../iam/presentation/views/forgot-password.vue'), meta: { layout: 'auth' } },
  { path: '/panel', component: () => import('../panel/presentation/views/panel.vue') },
  { path: '/patient-registration', component: () => import('../patient-registration/presentation/views/patient-list.vue'), meta: { title: 'Pacientes' } },
  { path: '/patient-registration/new', component: () => import('../patient-registration/presentation/views/registration.vue'), meta: { title: 'Registro de paciente' } },
  { path: '/patient-registration/:episode', component: () => import('../patient-registration/presentation/views/patient-file.vue'), meta: { title: 'Ficha del paciente' } },
  { path: '/alerting', component: soon, meta: { title: 'Alertas' } },
  { path: '/reports', component: soon, meta: { title: 'Reportes' } },
  { path: '/devices', component: soon, meta: { title: 'Dispositivos' } },
  { path: '/subscriptions', component: soon, meta: { title: 'Suscripción' } }
]