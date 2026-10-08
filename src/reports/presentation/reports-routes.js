const reportsView = () => import('./views/reports-view.vue')

const reportsRoutes = [
  { path: '', name: 'reports', component: reportsView, meta: { titleKey: 'nav.reports' } }
]

export default reportsRoutes
